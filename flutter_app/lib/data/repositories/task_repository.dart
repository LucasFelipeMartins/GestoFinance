import 'package:uuid/uuid.dart';

import '../../models/enums.dart';
import '../../models/models.dart';
import '../../utils/formatters.dart';
import '../local/local_db.dart';
import '../local/outbox.dart';
import '../remote/services.dart';

const _uuid = Uuid();

/// Mirrors server/src/utils/taskSort.ts — the list must read the same online
/// or off: overdue first, then priority, then due date, then newest.
int defaultTaskSort(Task a, Task b) {
  final overdueA = isOverdue(a.dueDate, a.status) ? 0 : 1;
  final overdueB = isOverdue(b.dueDate, b.status) ? 0 : 1;
  if (overdueA != overdueB) return overdueA - overdueB;

  final priorityDiff = a.priority.rank - b.priority.rank;
  if (priorityDiff != 0) return priorityDiff;

  final dueA = a.dueDate?.millisecondsSinceEpoch ?? double.maxFinite.toInt();
  final dueB = b.dueDate?.millisecondsSinceEpoch ?? double.maxFinite.toInt();
  if (dueA != dueB) return dueA.compareTo(dueB);

  return b.createdAt.compareTo(a.createdAt);
}

class TaskFormInput {
  const TaskFormInput({
    required this.title,
    required this.priority,
    this.description,
    this.clientId,
    this.dueDate,
    this.status,
    this.reminderEnabled,
    this.clearDueDate = false,
    this.clearClientId = false,
  });

  final String title;
  final Priority priority;
  final String? description;
  final String? clientId;
  final DateTime? dueDate;
  final EntityStatus? status;
  final bool? reminderEnabled;
  final bool clearDueDate;
  final bool clearClientId;
}

class TaskQuery {
  const TaskQuery({this.search, this.status, this.priority, this.clientId, this.sort, this.ascending = true});
  final String? search;
  final EntityStatus? status;
  final Priority? priority;
  final String? clientId;
  final String? sort;
  final bool ascending;
}

class TaskRepository {
  TaskRepository(this._db) : _outbox = Outbox(_db);

  final LocalDb _db;
  final Outbox _outbox;

  List<Task> _all() => allJson(_db.tasks).map(Task.fromJson).toList();

  /// Joins the small bits of the Client the UI needs. Resolved locally, never
  /// fetched — it has to work offline.
  List<Task> _attachClients(List<Task> tasks) {
    final byId = <String, TaskClientRef>{};
    for (final raw in _db.clients.values) {
      final client = Client.fromJson(asJson(raw));
      byId[client.id] = TaskClientRef.fromClient(client);
    }
    return tasks
        .map((task) => task.clientId == null ? task : task.copyWith(client: byId[task.clientId]))
        .toList();
  }

  List<Task> list([TaskQuery query = const TaskQuery()]) {
    var rows = _all();

    // Completed tasks past their 24h stay are already on their way out (see
    // purgeExpiredCompleted, which runs on the sync cycle). Dropping them
    // here too means the list never shows one in the window between expiring
    // and the next purge pass.
    rows = rows.where((t) => !_isExpired(t)).toList();

    if (query.status != null) rows = rows.where((t) => t.status == query.status).toList();
    if (query.priority != null) rows = rows.where((t) => t.priority == query.priority).toList();
    if (query.clientId != null) rows = rows.where((t) => t.clientId == query.clientId).toList();
    if (query.search != null && query.search!.trim().isNotEmpty) {
      final term = query.search!.trim().toLowerCase();
      rows = rows
          .where((t) =>
              t.title.toLowerCase().contains(term) ||
              (t.description ?? '').toLowerCase().contains(term))
          .toList();
    }

    if (query.sort == null) {
      rows.sort(defaultTaskSort);
    } else {
      final direction = query.ascending ? 1 : -1;
      rows.sort((a, b) => switch (query.sort) {
            'dueDate' => direction * _compareNullableDates(a.dueDate, b.dueDate),
            'priority' => direction * a.priority.rank.compareTo(b.priority.rank),
            'status' => direction * a.status.index.compareTo(b.status.index),
            _ => direction * a.createdAt.compareTo(b.createdAt),
          });
    }

    return _attachClients(rows);
  }

  Task? get(String id) {
    final raw = _db.tasks.get(id);
    if (raw == null) return null;
    return _attachClients([Task.fromJson(asJson(raw))]).first;
  }

  Future<Task> create(TaskFormInput input) async {
    final now = DateTime.now();
    final status = input.status ?? EntityStatus.pending;
    final task = Task(
      id: _uuid.v4(),
      title: input.title,
      description: input.description,
      clientId: input.clientId,
      dueDate: input.dueDate,
      priority: input.priority,
      status: status,
      reminderEnabled: input.reminderEnabled ?? false,
      createdAt: now,
      updatedAt: now,
      // A task filed as already done starts its 24h retention right away —
      // completedAt has to be set wherever status becomes completed, not only
      // in updateStatus, or the row would never age out.
      completedAt: status == EntityStatus.completed ? now : null,
    );

    await _db.tasks.put(task.id, task.toJson());
    await _outbox.enqueue(OutboxEntity.task, task.id, OutboxType.create, taskCreatePayload(task));
    return _attachClients([task]).first;
  }

  Future<Task> update(String id, TaskFormInput input) async {
    final existing = get(id);
    if (existing == null) throw StateError('Tarefa não encontrada localmente.');

    final now = DateTime.now();
    final status = input.status ?? existing.status;
    // The edit form can flip status just as the checkbox does, so keep the
    // completion stamp in step here too — it is what the 24h retention counts
    // from. Re-completing an already-done task keeps the original stamp
    // rather than restarting the clock.
    final completedAt =
        status == EntityStatus.completed ? existing.completedAt ?? now : null;

    final updated = existing.copyWith(
      title: input.title,
      description: input.description,
      clearDescription: input.description == null,
      clientId: input.clientId,
      clearClientId: input.clearClientId,
      dueDate: input.dueDate,
      clearDueDate: input.clearDueDate,
      priority: input.priority,
      status: input.status,
      reminderEnabled: input.reminderEnabled,
      updatedAt: now,
      completedAt: completedAt,
      clearCompletedAt: completedAt == null,
    );

    await _db.tasks.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.task, id, OutboxType.update, taskUpdatePayload(updated));
    return _attachClients([updated]).first;
  }

  /// Quick opt-in/out toggle for the reminder bell — reuses the same outbox
  /// path as any other field edit, so there is no separate branch to keep in
  /// step.
  Future<Task> setReminder(String id, bool enabled) async {
    final existing = get(id);
    if (existing == null) throw StateError('Tarefa não encontrada localmente.');

    final updated = existing.copyWith(reminderEnabled: enabled, updatedAt: DateTime.now());
    await _db.tasks.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.task, id, OutboxType.update, taskUpdatePayload(updated));
    return _attachClients([updated]).first;
  }

  Future<Task> updateStatus(String id, EntityStatus status) async {
    final existing = get(id);
    if (existing == null) throw StateError('Tarefa não encontrada localmente.');

    final now = DateTime.now();
    final completedAt = status == EntityStatus.completed ? now : null;
    final updated = existing.copyWith(
      status: status,
      updatedAt: now,
      completedAt: completedAt,
      clearCompletedAt: completedAt == null,
    );

    await _db.tasks.put(id, updated.toJson());
    await _outbox.enqueue(
      OutboxEntity.task,
      id,
      OutboxType.status,
      statusPayload(status, now, completedAt),
    );
    return _attachClients([updated]).first;
  }

  Future<void> remove(String id) async {
    await _db.tasks.delete(id);
    final cancelled = await _outbox.cancelPendingCreate(OutboxEntity.task, id);
    if (!cancelled) {
      await _outbox.enqueue(OutboxEntity.task, id, OutboxType.delete);
    }
  }

  bool _isExpired(Task task) => isExpiredCompletedTask(
        completed: task.status == EntityStatus.completed,
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
      );

  /// Drops completed tasks whose 24h stay has run out — from the local store
  /// now and, through the outbox, from the server on the next push. Called at
  /// the top of every sync cycle, so it also runs offline: the local row goes
  /// immediately and the delete rides out on reconnect.
  ///
  /// Returns how many rows it removed.
  Future<int> purgeExpiredCompleted() async {
    // A pull can hand a row back before its queued delete has made it to the
    // server; re-queueing the same delete every cycle would just grow the
    // outbox, so leave those to the entry that is already waiting.
    final awaitingDelete = _outbox
        .pending()
        .where((e) => e.entity == OutboxEntity.task && e.type == OutboxType.delete)
        .map((e) => e.entityId)
        .toSet();

    final expired =
        _all().where((t) => !awaitingDelete.contains(t.id) && _isExpired(t)).toList();

    for (final task in expired) {
      await remove(task.id);
    }

    return expired.length;
  }

  Future<void> cascadeClientRemoval(String clientId, String action) async {
    final affected = _all().where((t) => t.clientId == clientId).toList();

    for (final task in affected) {
      if (action == 'delete') {
        await remove(task.id);
      } else {
        final updated = task.copyWith(clearClientId: true, updatedAt: DateTime.now());
        await _db.tasks.put(task.id, updated.toJson());
        await _outbox.enqueue(OutboxEntity.task, task.id, OutboxType.update, taskUpdatePayload(updated));
      }
    }
  }

  Future<void> upsertFromServer(Task task) async {
    final raw = _db.tasks.get(task.id);
    if (raw != null && Task.fromJson(asJson(raw)).updatedAt.isAfter(task.updatedAt)) return;
    await _db.tasks.put(task.id, task.toJson());
  }

  Future<void> replaceLocal(Task task) => _db.tasks.put(task.id, task.toJson());

  Set<String> allLocalIds() => _db.tasks.keys.map((k) => k.toString()).toSet();

  Future<void> removeLocalOnly(String id) => _db.tasks.delete(id);
}

int _compareNullableDates(DateTime? a, DateTime? b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.compareTo(b);
}
