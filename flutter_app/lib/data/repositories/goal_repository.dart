import 'package:uuid/uuid.dart';

import '../../models/models.dart';
import '../local/local_db.dart';
import '../local/outbox.dart';

const _uuid = Uuid();

class GoalFormInput {
  const GoalFormInput({
    required this.title,
    required this.targetAmount,
    required this.targetDate,
    this.notes,
  });

  final String title;
  final double targetAmount;
  final DateTime targetDate;
  final String? notes;
}

/// Metas and their deposits.
///
/// Deposits are separate records rather than a running total, so two devices
/// adding money while offline both survive — see the GoalContribution doc.
class GoalRepository {
  GoalRepository(this._db) : _outbox = Outbox(_db);

  final LocalDb _db;
  final Outbox _outbox;

  List<Goal> _goals() => allJson(_db.goals).map(Goal.fromJson).toList();

  List<GoalContribution> _contributions() =>
      allJson(_db.goalContributions).map(GoalContribution.fromJson).toList();

  /// Every goal with its deposits folded in, soonest prazo first, and any
  /// already-reached goal pushed to the end so open ones lead.
  List<GoalProgress> list() {
    final byGoal = <String, List<GoalContribution>>{};
    for (final contribution in _contributions()) {
      byGoal.putIfAbsent(contribution.goalId, () => []).add(contribution);
    }

    final progress = _goals().map((goal) {
      final contributions = byGoal[goal.id] ?? const <GoalContribution>[];
      final sorted = [...contributions]..sort((a, b) => b.date.compareTo(a.date));
      return GoalProgress(goal: goal, contributions: sorted);
    }).toList();

    progress.sort((a, b) {
      if (a.isComplete != b.isComplete) return a.isComplete ? 1 : -1;
      return a.goal.targetDate.compareTo(b.goal.targetDate);
    });

    return progress;
  }

  GoalProgress? get(String id) {
    for (final progress in list()) {
      if (progress.goal.id == id) return progress;
    }
    return null;
  }

  Future<Goal> create(GoalFormInput input) async {
    final now = DateTime.now();
    final goal = Goal(
      id: _uuid.v4(),
      title: input.title,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    );

    await _db.goals.put(goal.id, goal.toJson());
    await _outbox.enqueue(OutboxEntity.goal, goal.id, OutboxType.create, {
      'localId': goal.id,
      ..._goalPayload(goal),
      'createdAt': goal.createdAt.toIso8601String(),
    });
    return goal;
  }

  Future<Goal> update(String id, GoalFormInput input) async {
    final raw = _db.goals.get(id);
    if (raw == null) throw StateError('Meta não encontrada localmente.');

    final updated = Goal.fromJson(asJson(raw)).copyWith(
      title: input.title,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      notes: input.notes,
      clearNotes: input.notes == null,
      updatedAt: DateTime.now(),
    );

    await _db.goals.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.goal, id, OutboxType.update, _goalPayload(updated));
    return updated;
  }

  Future<void> remove(String id) async {
    await _db.goals.delete(id);

    // Drop the deposits locally too; the server cascades the same way, so a
    // pushed delete does not need to mention them.
    for (final contribution in _contributions().where((c) => c.goalId == id)) {
      await _db.goalContributions.delete(contribution.id);
      await _outbox.cancelPendingCreate(OutboxEntity.goalContribution, contribution.id);
    }

    final cancelled = await _outbox.cancelPendingCreate(OutboxEntity.goal, id);
    if (!cancelled) {
      await _outbox.enqueue(OutboxEntity.goal, id, OutboxType.delete);
    }
  }

  /// Adds money to a goal. Each call is a new record, never an increment.
  Future<GoalContribution> addContribution(
    String goalId,
    double amount, {
    DateTime? date,
    String? note,
  }) async {
    final now = DateTime.now();
    final contribution = GoalContribution(
      id: _uuid.v4(),
      goalId: goalId,
      amount: amount,
      date: date ?? now,
      note: note,
      createdAt: now,
      updatedAt: now,
    );

    await _db.goalContributions.put(contribution.id, contribution.toJson());
    await _outbox.enqueue(
      OutboxEntity.goalContribution,
      contribution.id,
      OutboxType.create,
      {
        'localId': contribution.id,
        ..._contributionPayload(contribution),
        'createdAt': contribution.createdAt.toIso8601String(),
      },
    );

    await _syncCompletion(goalId);
    return contribution;
  }

  Future<void> removeContribution(String id) async {
    final raw = _db.goalContributions.get(id);
    final goalId = raw == null ? null : GoalContribution.fromJson(asJson(raw)).goalId;

    await _db.goalContributions.delete(id);
    final cancelled = await _outbox.cancelPendingCreate(OutboxEntity.goalContribution, id);
    if (!cancelled) {
      await _outbox.enqueue(OutboxEntity.goalContribution, id, OutboxType.delete);
    }

    if (goalId != null) await _syncCompletion(goalId);
  }

  /// Keeps `completedAt` in step with the deposits, so reaching the target
  /// marks the goal done and pulling money back out reopens it.
  Future<void> _syncCompletion(String goalId) async {
    final progress = get(goalId);
    if (progress == null) return;

    final shouldBeComplete = progress.isComplete;
    final isMarked = progress.goal.completedAt != null;
    if (shouldBeComplete == isMarked) return;

    final now = DateTime.now();
    final updated = progress.goal.copyWith(
      completedAt: shouldBeComplete ? now : null,
      clearCompletedAt: !shouldBeComplete,
      updatedAt: now,
    );

    await _db.goals.put(goalId, updated.toJson());
    await _outbox.enqueue(OutboxEntity.goal, goalId, OutboxType.update, _goalPayload(updated));
  }

  Map<String, dynamic> _goalPayload(Goal goal) => {
        'title': goal.title,
        'targetAmount': goal.targetAmount,
        'targetDate': goal.targetDate.toIso8601String(),
        // '' rather than omitted so a cleared note survives JSON — an omitted
        // key reads on the server as "leave it as is".
        'notes': goal.notes ?? '',
        if (goal.completedAt != null) 'completedAt': goal.completedAt!.toIso8601String(),
        'updatedAt': goal.updatedAt.toIso8601String(),
      };

  Map<String, dynamic> _contributionPayload(GoalContribution contribution) => {
        'goalId': contribution.goalId,
        'amount': contribution.amount,
        'date': contribution.date.toIso8601String(),
        'note': contribution.note ?? '',
        'updatedAt': contribution.updatedAt.toIso8601String(),
      };

  /* --- sync-engine hooks --- */

  Future<void> upsertGoalFromServer(Goal goal) async {
    final raw = _db.goals.get(goal.id);
    if (raw != null && Goal.fromJson(asJson(raw)).updatedAt.isAfter(goal.updatedAt)) return;
    await _db.goals.put(goal.id, goal.toJson());
  }

  Future<void> upsertContributionFromServer(GoalContribution contribution) async {
    final raw = _db.goalContributions.get(contribution.id);
    if (raw != null &&
        GoalContribution.fromJson(asJson(raw)).updatedAt.isAfter(contribution.updatedAt)) {
      return;
    }
    await _db.goalContributions.put(contribution.id, contribution.toJson());
  }

  Future<void> replaceGoalLocal(Goal goal) => _db.goals.put(goal.id, goal.toJson());

  Future<void> replaceContributionLocal(GoalContribution contribution) =>
      _db.goalContributions.put(contribution.id, contribution.toJson());

  Set<String> allGoalIds() => _db.goals.keys.map((k) => k.toString()).toSet();

  Set<String> allContributionIds() =>
      _db.goalContributions.keys.map((k) => k.toString()).toSet();

  Future<void> removeGoalLocalOnly(String id) => _db.goals.delete(id);

  Future<void> removeContributionLocalOnly(String id) => _db.goalContributions.delete(id);
}
