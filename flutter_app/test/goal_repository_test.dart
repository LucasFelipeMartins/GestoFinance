import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:gestorpro/data/local/local_db.dart';
import 'package:gestorpro/data/local/outbox.dart';
import 'package:gestorpro/data/repositories/goal_repository.dart';

/// Exercises Metas against a real local store.
///
/// The arithmetic in GoalProgress is easy to eyeball; what is not is whether a
/// deposit actually lands, whether reaching the target flips the goal to
/// complete, and whether any of it queues the right pushes. That is what these
/// cover.
void main() {
  late Directory dir;
  late LocalDb db;
  late GoalRepository goals;
  late Outbox outbox;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('gestorpro-goals');
    db = LocalDb.instance;
    await db.init(path: dir.path);
    await db.clearAll();
    goals = GoalRepository(db);
    outbox = Outbox(db);
  });

  tearDown(() async {
    await db.clearAll();
  });

  DateTime inMonths(int months) {
    final now = DateTime.now();
    return DateTime(now.year, now.month + months, now.day);
  }

  Future<String> newGoal({double target = 1200, int months = 5, String title = 'Viajar'}) async {
    final goal = await goals.create(GoalFormInput(
      title: title,
      targetAmount: target,
      targetDate: inMonths(months),
    ));
    return goal.id;
  }

  group('creating a meta', () {
    test('starts empty, with the full amount still to go', () async {
      final id = await newGoal();
      final progress = goals.get(id)!;

      expect(progress.saved, 0);
      expect(progress.remaining, 1200);
      expect(progress.percent, 0);
      expect(progress.isComplete, isFalse);
    });

    test('spreads the target across the prazo', () async {
      final id = await newGoal(target: 1200, months: 5);
      final progress = goals.get(id)!;

      expect(progress.monthsLeft, 5);
      // The question the prazo raises: R$ 1.200 in 5 months is R$ 240 a month.
      expect(progress.monthlyNeeded, closeTo(240, 0.01));
    });

    test('queues exactly one create', () async {
      await newGoal();
      final queued = outbox.pending();
      expect(queued.length, 1);
      expect(queued.single.entity, OutboxEntity.goal);
      expect(queued.single.type, OutboxType.create);
    });
  });

  group('adding a value', () {
    test('moves the bar and shrinks what is left', () async {
      final id = await newGoal(target: 1200);

      await goals.addContribution(id, 300);
      var progress = goals.get(id)!;
      expect(progress.saved, 300);
      expect(progress.remaining, 900);
      expect(progress.percent, closeTo(0.25, 1e-9));

      await goals.addContribution(id, 300);
      progress = goals.get(id)!;
      expect(progress.saved, 600);
      expect(progress.percent, closeTo(0.5, 1e-9));
    });

    test('each deposit is its own record, never an increment', () async {
      final id = await newGoal();
      await goals.addContribution(id, 100);
      await goals.addContribution(id, 100);

      final progress = goals.get(id)!;
      expect(progress.contributions.length, 2);
      // Two independent creates is what lets two offline devices both survive.
      final creates = outbox
          .pending()
          .where((e) => e.entity == OutboxEntity.goalContribution && e.type == OutboxType.create);
      expect(creates.length, 2);
    });

    test('deposits come back newest first', () async {
      final id = await newGoal();
      await goals.addContribution(id, 100, date: DateTime(2026, 1, 10));
      await goals.addContribution(id, 200, date: DateTime(2026, 3, 10));

      final progress = goals.get(id)!;
      expect(progress.contributions.first.amount, 200);
    });

    test('a negative deposit undoes a mistake without erasing history', () async {
      final id = await newGoal();
      await goals.addContribution(id, 500);
      await goals.addContribution(id, -200, note: 'estorno');

      final progress = goals.get(id)!;
      expect(progress.saved, 300);
      expect(progress.contributions.length, 2);
    });
  });

  group('reaching the target', () {
    test('marks the goal complete', () async {
      final id = await newGoal(target: 1000);
      await goals.addContribution(id, 1000);

      final progress = goals.get(id)!;
      expect(progress.isComplete, isTrue);
      expect(progress.goal.completedAt, isNotNull);
      expect(progress.remaining, 0);
      expect(progress.monthlyNeeded, 0);
    });

    test('overshooting still reads as 100%, not more', () async {
      final id = await newGoal(target: 1000);
      await goals.addContribution(id, 1500);

      final progress = goals.get(id)!;
      expect(progress.percent, 1.0);
      expect(progress.remaining, 0);
      expect(progress.saved, 1500);
    });

    test('pulling money back out reopens it', () async {
      final id = await newGoal(target: 1000);
      await goals.addContribution(id, 1000);
      expect(goals.get(id)!.goal.completedAt, isNotNull);

      final deposit = goals.get(id)!.contributions.first;
      await goals.removeContribution(deposit.id);

      final progress = goals.get(id)!;
      expect(progress.isComplete, isFalse);
      expect(progress.goal.completedAt, isNull);
    });
  });

  group('listing', () {
    test('open goals lead, then the soonest prazo first', () async {
      final far = await newGoal(title: 'Longe', target: 100, months: 12);
      final soon = await newGoal(title: 'Perto', target: 100, months: 2);
      final done = await newGoal(title: 'Feita', target: 100, months: 1);
      await goals.addContribution(done, 100);

      final ordered = goals.list().map((p) => p.goal.id).toList();
      expect(ordered, [soon, far, done]);
    });
  });

  group('removing a meta', () {
    test('takes its deposits with it', () async {
      final id = await newGoal();
      await goals.addContribution(id, 100);
      await goals.addContribution(id, 200);

      await goals.remove(id);

      expect(goals.get(id), isNull);
      expect(db.goalContributions.length, 0);
    });

    test('a never-synced meta cancels its queued pushes instead of adding a delete',
        () async {
      final id = await newGoal();
      await goals.addContribution(id, 100);
      await goals.remove(id);

      // Nothing ever reached the server, so the server never needs to hear
      // about any of it.
      expect(outbox.pending(), isEmpty);
    });
  });
}
