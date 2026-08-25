import 'package:uuid/uuid.dart';

import '../../models/enums.dart';
import '../../models/models.dart';
import '../../utils/formatters.dart';
import '../local/local_db.dart';
import '../local/outbox.dart';
import '../remote/services.dart';
import 'task_repository.dart';

const _uuid = Uuid();

class ClientFormInput {
  const ClientFormInput({
    required this.name,
    required this.phone,
    required this.service,
    required this.price,
    required this.priority,
    this.status,
    this.avatarUrl,
    this.deliveryDate,
    this.clearDeliveryDate = false,
  });

  final String name;
  final String phone;
  final String service;
  final double price;
  final Priority priority;
  final EntityStatus? status;
  final String? avatarUrl;
  final DateTime? deliveryDate;
  final bool clearDeliveryDate;
}

class ClientQuery {
  const ClientQuery({this.search, this.status, this.priority, this.sort, this.ascending = false});
  final String? search;
  final EntityStatus? status;
  final Priority? priority;
  final String? sort;
  final bool ascending;
}

class ClientRepository {
  ClientRepository(this._db) : _outbox = Outbox(_db);

  final LocalDb _db;
  final Outbox _outbox;

  List<Client> _all() => allJson(_db.clients).map(Client.fromJson).toList();

  List<Client> list([ClientQuery query = const ClientQuery()]) {
    var rows = _all();

    if (query.status != null) rows = rows.where((c) => c.status == query.status).toList();
    if (query.priority != null) rows = rows.where((c) => c.priority == query.priority).toList();
    if (query.search != null && query.search!.trim().isNotEmpty) {
      final term = query.search!.trim().toLowerCase();
      rows = rows
          .where((c) =>
              c.name.toLowerCase().contains(term) ||
              c.phone.toLowerCase().contains(term) ||
              c.service.toLowerCase().contains(term))
          .toList();
    }

    final direction = query.ascending ? 1 : -1;
    rows.sort((a, b) => switch (query.sort ?? 'createdAt') {
          'name' => direction * a.name.toLowerCase().compareTo(b.name.toLowerCase()),
          'price' => direction * a.price.compareTo(b.price),
          'priority' => direction * a.priority.rank.compareTo(b.priority.rank),
          'status' => direction * a.status.index.compareTo(b.status.index),
          'deliveryDate' => direction *
              _compareNullableDates(a.deliveryDate, b.deliveryDate),
          _ => direction * a.createdAt.compareTo(b.createdAt),
        });

    return rows;
  }

  Client? get(String id) {
    final raw = _db.clients.get(id);
    return raw == null ? null : Client.fromJson(asJson(raw));
  }

  Future<Client> create(ClientFormInput input) async {
    final now = DateTime.now();
    final client = Client(
      id: _uuid.v4(),
      name: input.name,
      phone: input.phone,
      service: input.service,
      price: input.price,
      initials: getInitials(input.name),
      priority: input.priority,
      status: input.status ?? EntityStatus.pending,
      avatarUrl: input.avatarUrl,
      deliveryDate: input.deliveryDate,
      createdAt: now,
      updatedAt: now,
    );

    await _db.clients.put(client.id, client.toJson());
    await _outbox.enqueue(OutboxEntity.client, client.id, OutboxType.create, clientCreatePayload(client));
    return client;
  }

  Future<Client> update(String id, ClientFormInput input) async {
    final existing = get(id);
    if (existing == null) throw StateError('Cliente não encontrado localmente.');

    final updated = existing.copyWith(
      name: input.name,
      phone: input.phone,
      service: input.service,
      price: input.price,
      initials: getInitials(input.name),
      priority: input.priority,
      status: input.status,
      avatarUrl: input.avatarUrl,
      deliveryDate: input.deliveryDate,
      clearDeliveryDate: input.clearDeliveryDate,
      updatedAt: DateTime.now(),
    );

    await _db.clients.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.client, id, OutboxType.update, clientUpdatePayload(updated));
    return updated;
  }

  Future<Client> updateStatus(String id, EntityStatus status) async {
    final existing = get(id);
    if (existing == null) throw StateError('Cliente não encontrado localmente.');

    final now = DateTime.now();
    final completedAt = status == EntityStatus.completed ? now : null;
    final updated = existing.copyWith(
      status: status,
      updatedAt: now,
      completedAt: completedAt,
      clearCompletedAt: completedAt == null,
    );

    await _db.clients.put(id, updated.toJson());
    await _outbox.enqueue(
      OutboxEntity.client,
      id,
      OutboxType.status,
      statusPayload(status, now, completedAt),
    );
    return updated;
  }

  Future<void> remove(String id, TaskRepository tasks, {String tasksAction = 'unlink'}) async {
    await _db.clients.delete(id);
    await tasks.cascadeClientRemoval(id, tasksAction);

    final cancelled = await _outbox.cancelPendingCreate(OutboxEntity.client, id);
    if (!cancelled) {
      await _outbox.enqueue(OutboxEntity.client, id, OutboxType.delete, {'tasksAction': tasksAction});
    }
  }

  /// Used by the sync engine to merge server state into the local store.
  Future<void> upsertFromServer(Client client) async {
    final existing = get(client.id);
    if (existing != null && existing.updatedAt.isAfter(client.updatedAt)) {
      // Local version is newer (edited offline since the last pull) — keep it;
      // the outbox will push it and reconcile on the next round trip.
      return;
    }
    await _db.clients.put(client.id, client.toJson());
  }

  Future<void> replaceLocal(Client client) => _db.clients.put(client.id, client.toJson());

  Set<String> allLocalIds() => _db.clients.keys.map((k) => k.toString()).toSet();

  Future<void> removeLocalOnly(String id) => _db.clients.delete(id);
}

int _compareNullableDates(DateTime? a, DateTime? b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.compareTo(b);
}
