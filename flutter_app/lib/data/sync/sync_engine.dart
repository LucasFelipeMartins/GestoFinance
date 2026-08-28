import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../local/local_db.dart';
import '../local/outbox.dart';
import '../remote/api_client.dart';
import '../remote/services.dart';
import '../repositories/client_repository.dart';
import '../repositories/finance_repository.dart';
import '../repositories/goal_repository.dart';
import '../repositories/task_repository.dart';

class SyncStatus {
  const SyncStatus({
    this.isOnline = true,
    this.isSyncing = false,
    this.pendingCount = 0,
    this.lastSyncedAt,
    this.lastError,
  });

  final bool isOnline;
  final bool isSyncing;
  final int pendingCount;
  final DateTime? lastSyncedAt;
  final String? lastError;

  SyncStatus copyWith({
    bool? isOnline,
    bool? isSyncing,
    int? pendingCount,
    DateTime? lastSyncedAt,
    String? lastError,
    bool clearError = false,
  }) =>
      SyncStatus(
        isOnline: isOnline ?? this.isOnline,
        isSyncing: isSyncing ?? this.isSyncing,
        pendingCount: pendingCount ?? this.pendingCount,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
        lastError: clearError ? null : (lastError ?? this.lastError),
      );
}

enum _PushOutcome { ok, offline, failed }

const _maxAttempts = 5;
const _syncInterval = Duration(minutes: 2);

/// The only thing in the app that talks to the network.
///
/// Screens read and write the local store; this drains the queue in order
/// whenever there is a connection, then pulls the server's state back down.
/// Conflicts resolve last-write-wins on `updatedAt`, matching the server.
class SyncEngine {
  SyncEngine({
    required LocalDb db,
    required this.clients,
    required this.tasks,
    required this.finance,
    required this.goals,
    this.onChanged,
  })  : _db = db,
        _outbox = Outbox(db);

  final LocalDb _db;
  final Outbox _outbox;
  final ClientRepository clients;
  final TaskRepository tasks;
  final FinanceRepository finance;
  final GoalRepository goals;

  /// Fired after a pull changes local data, so the UI can refresh.
  final VoidCallback? onChanged;

  final status = ValueNotifier<SyncStatus>(const SyncStatus());

  final _clientService = const ClientService();
  final _taskService = const TaskService();
  final _financeService = const FinanceService();
  final _goalService = const GoalService();

  bool _syncing = false;
  bool _started = false;
  Timer? _timer;
  StreamSubscription<List<ConnectivityResult>>? _connectivity;

  void start() {
    if (_started) return;
    _started = true;

    _refreshPendingCount();

    _connectivity = Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
      status.value = status.value.copyWith(isOnline: online);
      if (online) unawaited(run());
    });

    _timer = Timer.periodic(_syncInterval, (_) => unawaited(run()));
    unawaited(run());
  }

  void dispose() {
    _timer?.cancel();
    unawaited(_connectivity?.cancel());
    status.dispose();
  }

  void _refreshPendingCount() {
    status.value = status.value.copyWith(pendingCount: _outbox.count);
  }

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    // On web the plugin often reports `none` even when the browser is fine;
    // trust it only when it says we are connected, and let the request itself
    // be the source of truth otherwise.
    if (kIsWeb) return true;
    return results.isNotEmpty && !results.contains(ConnectivityResult.none);
  }

  Future<void> run() async {
    if (_syncing) return;

    // Local housekeeping first: completed tasks past their 24h stay are
    // dropped here, and the deletes that queues go out with this very cycle.
    // Ahead of the connectivity check on purpose — freeing local space is
    // worth doing offline too.
    try {
      final purged = await tasks.purgeExpiredCompleted();
      // Each purged task queued a delete; say so now, since the offline path
      // below returns before the usual end-of-cycle refresh.
      if (purged > 0) _refreshPendingCount();
    } catch (error) {
      debugPrint('[sync] purge failed: $error');
    }

    final online = await _isOnline();
    status.value = status.value.copyWith(isOnline: online);
    if (!online) return;

    _syncing = true;
    status.value = status.value.copyWith(isSyncing: true, clearError: true);
    try {
      await _pushOutbox();
      await _pullRemote();
      status.value = status.value.copyWith(lastSyncedAt: DateTime.now());
      onChanged?.call();
    } catch (error) {
      debugPrint('[sync] cycle failed: $error');
      status.value = status.value.copyWith(lastError: apiErrorMessage(error, 'Falha ao sincronizar.'));
    } finally {
      _syncing = false;
      status.value = status.value.copyWith(isSyncing: false);
      _refreshPendingCount();
    }
  }

  Future<void> _pushOutbox() async {
    for (final entry in _outbox.pending()) {
      final outcome = await _pushEntry(entry);

      if (outcome == _PushOutcome.offline) break;

      if (outcome == _PushOutcome.ok) {
        await _outbox.remove(entry.key);
        continue;
      }

      // A real (non-network) error. Retry a few times in case it is
      // transient, then give up so one bad entry cannot block sync forever —
      // entities have no ordering dependency on each other, since references
      // are plain client-generated ids rather than server foreign keys.
      final attempts = entry.attempts + 1;
      if (attempts >= _maxAttempts) {
        await _outbox.remove(entry.key);
      } else {
        await _outbox.markFailed(entry.key, 'push falhou', attempts);
      }
    }

    _refreshPendingCount();
  }

  Future<_PushOutcome> _pushEntry(OutboxEntry entry) async {
    try {
      switch (entry.entity) {
        case OutboxEntity.client:
          await _pushClient(entry);
        case OutboxEntity.task:
          await _pushTask(entry);
        case OutboxEntity.finance:
          await _pushFinance(entry);
        case OutboxEntity.goal:
          await _pushGoal(entry);
        case OutboxEntity.goalContribution:
          await _pushGoalContribution(entry);
      }
      return _PushOutcome.ok;
    } catch (error) {
      if (isNetworkError(error)) return _PushOutcome.offline;
      // A 404 on update/delete just means the other side of a cascade already
      // handled it server-side (deleting a client also deletes its tasks) —
      // treat as done, not as a failure.
      if (isNotFound(error) && entry.type != OutboxType.create) return _PushOutcome.ok;
      debugPrint('[sync] push failed for ${entry.entity.name}/${entry.entityId}: $error');
      return _PushOutcome.failed;
    }
  }

  Future<void> _pushClient(OutboxEntry entry) async {
    switch (entry.type) {
      case OutboxType.create:
        await clients.replaceLocal(await _clientService.create(entry.payload!));
      case OutboxType.update:
        await clients.replaceLocal(await _clientService.update(entry.entityId, entry.payload!));
      case OutboxType.status:
        await clients.replaceLocal(await _clientService.updateStatus(entry.entityId, entry.payload!));
      case OutboxType.delete:
        await _clientService.remove(entry.entityId,
            tasksAction: entry.payload?['tasksAction'] as String?);
    }
  }

  Future<void> _pushTask(OutboxEntry entry) async {
    switch (entry.type) {
      case OutboxType.create:
        await tasks.replaceLocal(await _taskService.create(entry.payload!));
      case OutboxType.update:
        await tasks.replaceLocal(await _taskService.update(entry.entityId, entry.payload!));
      case OutboxType.status:
        await tasks.replaceLocal(await _taskService.updateStatus(entry.entityId, entry.payload!));
      case OutboxType.delete:
        await _taskService.remove(entry.entityId);
    }
  }

  Future<void> _pushFinance(OutboxEntry entry) async {
    // Finance entries have no separate 'status' op — the "já foi pago" toggle
    // is just an update, so there are only three cases here.
    switch (entry.type) {
      case OutboxType.create:
        await finance.replaceLocal(await _financeService.create(entry.payload!));
      case OutboxType.update:
      case OutboxType.status:
        await finance.replaceLocal(await _financeService.update(entry.entityId, entry.payload!));
      case OutboxType.delete:
        await _financeService.remove(entry.entityId);
    }
  }

  Future<void> _pushGoal(OutboxEntry entry) async {
    switch (entry.type) {
      case OutboxType.create:
        await goals.replaceGoalLocal(await _goalService.create(entry.payload!));
      case OutboxType.update:
      case OutboxType.status:
        await goals.replaceGoalLocal(await _goalService.update(entry.entityId, entry.payload!));
      case OutboxType.delete:
        await _goalService.remove(entry.entityId);
    }
  }

  Future<void> _pushGoalContribution(OutboxEntry entry) async {
    switch (entry.type) {
      case OutboxType.create:
        await goals.replaceContributionLocal(
            await _goalService.createContribution(entry.payload!));
      case OutboxType.update:
      case OutboxType.status:
        await goals.replaceContributionLocal(
            await _goalService.updateContribution(entry.entityId, entry.payload!));
      case OutboxType.delete:
        await _goalService.removeContribution(entry.entityId);
    }
  }

  Future<void> _pullRemote() async {
    // Started together, awaited separately: the three requests still go out
    // in parallel, but each keeps its own type instead of collapsing to
    // Object through Future.wait.
    final clientsRequest = _clientService.list();
    final tasksRequest = _taskService.list();
    final financeRequest = _financeService.list();
    final goalsRequest = _goalService.list();

    final serverClients = await clientsRequest;
    final serverTasks = await tasksRequest;
    final serverFinance = await financeRequest;
    final serverGoals = await goalsRequest;

    for (final client in serverClients) {
      await clients.upsertFromServer(client);
    }
    for (final task in serverTasks) {
      await tasks.upsertFromServer(task);
    }
    for (final entry in serverFinance) {
      await finance.upsertFromServer(entry);
    }
    for (final goal in serverGoals.goals) {
      await goals.upsertGoalFromServer(goal);
    }
    for (final contribution in serverGoals.contributions) {
      await goals.upsertContributionFromServer(contribution);
    }

    // Anything local that is fully synced (no pending outbox entry) but
    // missing from the server was deleted elsewhere — mirror that locally.
    final pendingIds = _outbox.pending().map((e) => e.entityId).toSet();

    final serverClientIds = serverClients.map((c) => c.id).toSet();
    for (final id in clients.allLocalIds()) {
      if (!serverClientIds.contains(id) && !pendingIds.contains(id)) {
        await clients.removeLocalOnly(id);
      }
    }

    final serverTaskIds = serverTasks.map((t) => t.id).toSet();
    for (final id in tasks.allLocalIds()) {
      if (!serverTaskIds.contains(id) && !pendingIds.contains(id)) {
        await tasks.removeLocalOnly(id);
      }
    }

    final serverFinanceIds = serverFinance.map((e) => e.id).toSet();
    for (final id in finance.allLocalIds()) {
      if (!serverFinanceIds.contains(id) && !pendingIds.contains(id)) {
        await finance.removeLocalOnly(id);
      }
    }

    final serverGoalIds = serverGoals.goals.map((g) => g.id).toSet();
    for (final id in goals.allGoalIds()) {
      if (!serverGoalIds.contains(id) && !pendingIds.contains(id)) {
        await goals.removeGoalLocalOnly(id);
      }
    }

    final serverContributionIds = serverGoals.contributions.map((c) => c.id).toSet();
    for (final id in goals.allContributionIds()) {
      if (!serverContributionIds.contains(id) && !pendingIds.contains(id)) {
        await goals.removeContributionLocalOnly(id);
      }
    }
  }

  /// Called on logout, so the next account never inherits this one's queue.
  Future<void> reset() async {
    await _db.clearAll();
    _refreshPendingCount();
  }
}
