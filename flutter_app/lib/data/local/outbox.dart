import 'local_db.dart';

enum OutboxEntity { client, task, finance, goal, goalContribution }

enum OutboxType { create, update, status, delete }

/// One queued write, waiting for the network.
///
/// Every mutation lands in the local store first and enqueues here; the sync
/// engine drains the queue in order whenever there is a connection. Nothing
/// in the UI ever waits on a request.
class OutboxEntry {
  const OutboxEntry({
    required this.key,
    required this.entity,
    required this.entityId,
    required this.type,
    this.payload,
    required this.createdAt,
    this.attempts = 0,
    this.lastError,
  });

  /// The Hive auto-increment key — the queue's ordering and its delete handle.
  final int key;
  final OutboxEntity entity;
  final String entityId;
  final OutboxType type;
  final Map<String, dynamic>? payload;
  final int createdAt;

  /// Bumped after a failed push so one bad entry cannot block the queue forever.
  final int attempts;
  final String? lastError;

  Map<String, dynamic> toJson() => {
        'entity': entity.name,
        'entityId': entityId,
        'type': type.name,
        'payload': payload,
        'createdAt': createdAt,
        'attempts': attempts,
        'lastError': lastError,
      };

  factory OutboxEntry.fromJson(int key, Map<String, dynamic> json) => OutboxEntry(
        key: key,
        entity: OutboxEntity.values.firstWhere(
          (e) => e.name == json['entity'],
          orElse: () => OutboxEntity.client,
        ),
        entityId: (json['entityId'] ?? '').toString(),
        type: OutboxType.values.firstWhere(
          (t) => t.name == json['type'],
          orElse: () => OutboxType.update,
        ),
        payload: json['payload'] == null
            ? null
            : Map<String, dynamic>.from(json['payload'] as Map),
        createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
        attempts: (json['attempts'] as num?)?.toInt() ?? 0,
        lastError: json['lastError'] as String?,
      );
}

class Outbox {
  const Outbox(this._db);

  final LocalDb _db;

  Future<void> enqueue(
    OutboxEntity entity,
    String entityId,
    OutboxType type, [
    Map<String, dynamic>? payload,
  ]) async {
    await _db.outbox.add(OutboxEntry(
      key: -1,
      entity: entity,
      entityId: entityId,
      type: type,
      payload: payload,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ).toJson());
  }

  /// Oldest first — Hive's auto-increment keys are the insertion order.
  List<OutboxEntry> pending() {
    final keys = _db.outbox.keys.cast<int>().toList()..sort();
    return keys
        .map((key) => OutboxEntry.fromJson(key, asJson(_db.outbox.get(key))))
        .toList(growable: false);
  }

  Future<void> remove(int key) => _db.outbox.delete(key);

  Future<void> markFailed(int key, String message, int attempts) async {
    final existing = asJson(_db.outbox.get(key));
    existing['attempts'] = attempts;
    existing['lastError'] = message;
    await _db.outbox.put(key, existing);
  }

  /// If the entity was created (and possibly edited) locally but never
  /// synced, deleting it locally means the server never needs to hear about
  /// any of it — drop the whole queued history for that id instead of pushing
  /// a delete. Returns true if it cancelled something, in which case the
  /// caller should skip queuing the delete.
  Future<bool> cancelPendingCreate(OutboxEntity entity, String entityId) async {
    final matching = pending().where((e) => e.entity == entity && e.entityId == entityId).toList();
    if (!matching.any((e) => e.type == OutboxType.create)) return false;

    await _db.outbox.deleteAll(matching.map((e) => e.key));
    return true;
  }

  int get count => _db.outbox.length;
}
