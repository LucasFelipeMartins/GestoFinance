import 'package:uuid/uuid.dart';

import '../../models/enums.dart';
import '../../models/models.dart';
import '../local/local_db.dart';
import '../local/outbox.dart';
import '../remote/services.dart';

const _uuid = Uuid();

/// Namespaced so a derived id can never collide with a real (UUID) one.
const clientIncomePrefix = 'client:';

class FinanceFormInput {
  const FinanceFormInput({
    required this.kind,
    required this.description,
    required this.amount,
    required this.date,
    this.category,
    this.notes,
    this.paid,
    this.paymentMethod,
    this.installments,
    this.cdiPercent,
  });

  final FinanceKind kind;
  final String description;
  final double amount;
  final DateTime date;
  final String? category;
  final String? notes;
  final bool? paid;
  final PaymentMethod? paymentMethod;
  final int? installments;
  final double? cdiPercent;
}

class FinanceQuery {
  const FinanceQuery({this.kind, this.search, this.paid, this.clientId, this.sort, this.ascending = false});
  final FinanceKind? kind;
  final String? search;
  final bool? paid;
  final String? clientId;
  final String? sort;
  final bool ascending;
}

class FinanceRepository {
  FinanceRepository(this._db) : _outbox = Outbox(_db);

  final LocalDb _db;
  final Outbox _outbox;

  List<FinanceEntry> _stored() => allJson(_db.finance).map(FinanceEntry.fromJson).toList();

  /// The receita a concluded client produces.
  ///
  /// Derived on every read rather than written into the finance box when the
  /// client is completed. That means: no duplicate row if the outbox retries
  /// a status push, no orphan if the client is later deleted, no stale amount
  /// if its price is edited, and reopening a client simply makes its receita
  /// go away again. The cost is that these rows are read-only here — the
  /// client itself is where they are edited.
  List<FinanceEntry> deriveClientIncome() {
    return _db.clients.values
        .map((raw) => Client.fromJson(asJson(raw)))
        .where((client) => client.status == EntityStatus.completed && client.price > 0)
        .map((client) => FinanceEntry(
              id: '$clientIncomePrefix${client.id}',
              kind: FinanceKind.income,
              description: client.name,
              amount: client.price,
              // Clients completed before completedAt existed fall back to
              // updatedAt, which is when the status change landed.
              date: client.completedAt ?? client.updatedAt,
              category: client.service,
              clientId: client.id,
              source: FinanceSource.client,
              createdAt: client.createdAt,
              updatedAt: client.updatedAt,
            ))
        .toList();
  }

  List<FinanceEntry> list([FinanceQuery query = const FinanceQuery()]) {
    var entries = query.kind == null
        ? _stored()
        : _stored().where((e) => e.kind == query.kind).toList();

    // Concluded clients count as lucro, so they join the income ledger here —
    // one place, so the chart, the painel and the Lucros page can never
    // disagree with each other.
    if (query.kind == null || query.kind == FinanceKind.income) {
      entries = [...entries, ...deriveClientIncome()];
    }

    if (query.paid != null) entries = entries.where((e) => e.paid == query.paid).toList();
    if (query.clientId != null) entries = entries.where((e) => e.clientId == query.clientId).toList();
    if (query.search != null && query.search!.trim().isNotEmpty) {
      final term = query.search!.trim().toLowerCase();
      entries = entries
          .where((e) =>
              e.description.toLowerCase().contains(term) ||
              (e.category ?? '').toLowerCase().contains(term) ||
              (e.notes ?? '').toLowerCase().contains(term))
          .toList();
    }

    final direction = query.ascending ? 1 : -1;
    entries.sort((a, b) => switch (query.sort ?? 'date') {
          'amount' => direction * a.amount.compareTo(b.amount),
          'description' =>
            direction * a.description.toLowerCase().compareTo(b.description.toLowerCase()),
          'createdAt' => direction * a.createdAt.compareTo(b.createdAt),
          _ => direction * a.date.compareTo(b.date),
        });

    return entries;
  }

  FinanceEntry? get(String id) {
    if (id.startsWith(clientIncomePrefix)) {
      for (final entry in deriveClientIncome()) {
        if (entry.id == id) return entry;
      }
      return null;
    }
    final raw = _db.finance.get(id);
    return raw == null ? null : FinanceEntry.fromJson(asJson(raw));
  }

  /// Derived rows have no stored counterpart, so nothing here can edit them.
  void _assertStored(String id) {
    if (id.startsWith(clientIncomePrefix)) {
      throw StateError('Esse lucro vem de um cliente concluído. Edite o cliente para alterá-lo.');
    }
  }

  Future<FinanceEntry> create(FinanceFormInput input) async {
    final now = DateTime.now();
    final entry = FinanceEntry(
      id: _uuid.v4(),
      kind: input.kind,
      description: input.description,
      amount: input.amount,
      date: input.date,
      category: input.category,
      notes: input.notes,
      paid: input.paid ?? false,
      paymentMethod: input.paymentMethod,
      installments: input.installments,
      cdiPercent: input.cdiPercent,
      createdAt: now,
      updatedAt: now,
    ).normalized();

    await _db.finance.put(entry.id, entry.toJson());
    await _outbox.enqueue(OutboxEntity.finance, entry.id, OutboxType.create, financeCreatePayload(entry));
    return entry;
  }

  Future<FinanceEntry> update(String id, FinanceFormInput input) async {
    _assertStored(id);
    final existing = get(id);
    if (existing == null) throw StateError('Lançamento não encontrado localmente.');

    final now = DateTime.now();
    final wasPaid = existing.paid;
    final willBePaid = input.paid ?? existing.paid;

    final updated = existing
        .copyWith(
          kind: input.kind,
          description: input.description,
          amount: input.amount,
          date: input.date,
          category: input.category,
          clearCategory: input.category == null,
          notes: input.notes,
          clearNotes: input.notes == null,
          paid: willBePaid,
          // A fresh paidAt only when this edit is what flipped it to paid.
          paidAt: willBePaid && !wasPaid ? now : existing.paidAt,
          paymentMethod: input.paymentMethod,
          installments: input.installments,
          cdiPercent: input.cdiPercent,
          updatedAt: now,
        )
        .normalized();

    await _db.finance.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.finance, id, OutboxType.update, financeUpdatePayload(updated));
    return updated;
  }

  /// The "já foi pago" toggle on a conta a pagar. Rides the same outbox path
  /// as any other field edit.
  Future<FinanceEntry> setPaid(String id, bool paid) async {
    _assertStored(id);
    final existing = get(id);
    if (existing == null) throw StateError('Lançamento não encontrado localmente.');

    final now = DateTime.now();
    final updated = existing
        .copyWith(
          paid: paid,
          paidAt: paid && !existing.paid ? now : existing.paidAt,
          clearPaidAt: !paid,
          updatedAt: now,
        )
        .normalized();

    await _db.finance.put(id, updated.toJson());
    await _outbox.enqueue(OutboxEntity.finance, id, OutboxType.update, financeUpdatePayload(updated));
    return updated;
  }

  Future<void> remove(String id) async {
    _assertStored(id);
    await _db.finance.delete(id);
    final cancelled = await _outbox.cancelPendingCreate(OutboxEntity.finance, id);
    if (!cancelled) {
      await _outbox.enqueue(OutboxEntity.finance, id, OutboxType.delete);
    }
  }

  Future<void> upsertFromServer(FinanceEntry entry) async {
    final raw = _db.finance.get(entry.id);
    if (raw != null && FinanceEntry.fromJson(asJson(raw)).updatedAt.isAfter(entry.updatedAt)) return;
    await _db.finance.put(entry.id, entry.toJson());
  }

  Future<void> replaceLocal(FinanceEntry entry) => _db.finance.put(entry.id, entry.toJson());

  Set<String> allLocalIds() => _db.finance.keys.map((k) => k.toString()).toSet();

  Future<void> removeLocalOnly(String id) => _db.finance.delete(id);
}
