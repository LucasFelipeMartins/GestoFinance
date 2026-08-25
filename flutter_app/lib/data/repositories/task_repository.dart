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
    final task = Task(
      id: _uuid.v4(),
      title: input.title,
      description: input.description,
      clientId: input.clientId,
      dueDate: input.dueDate,
      priority: input.priority,
      status: input.status ?? EntityStatus.pending,
      reminderEnabled: input.reminderEnabled ?? false,
      createdAt: now,
      updatedAt: now,
    );

    await _db.tasks.put(task.id, task.toJson());
    await _outbox.enqueue(OutboxEntity.task, task.id, OutboxType.create, taskCreatePayload(task));
    return _attachClients([task]).first;
  }

  Future<Task> update(String id, TaskFormInput input) async {
    final existing = get(id);
    if (existing == null) throw StateError('Tarefa não encontrada localmente.');

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
      updatedAt: DateTime.now(),
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
