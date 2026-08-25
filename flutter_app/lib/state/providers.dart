import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/local/local_db.dart';
import '../data/remote/api_client.dart';
import '../data/remote/services.dart';
import '../data/repositories/client_repository.dart';
import '../data/repositories/dashboard_repository.dart';
import '../data/repositories/finance_repository.dart';
import '../data/repositories/goal_repository.dart';
import '../data/repositories/task_repository.dart';
import '../data/sync/sync_engine.dart';
import '../models/enums.dart';
import '../models/models.dart';
import '../utils/finance_math.dart';

/// Overridden in main() once Hive is open, so nothing can read a box before
/// it exists.
final localDbProvider = Provider<LocalDb>((ref) => throw UnimplementedError());

final clientRepositoryProvider =
    Provider<ClientRepository>((ref) => ClientRepository(ref.watch(localDbProvider)));

final taskRepositoryProvider =
    Provider<TaskRepository>((ref) => TaskRepository(ref.watch(localDbProvider)));

final financeRepositoryProvider =
    Provider<FinanceRepository>((ref) => FinanceRepository(ref.watch(localDbProvider)));

final goalRepositoryProvider =
    Provider<GoalRepository>((ref) => GoalRepository(ref.watch(localDbProvider)));

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) => DashboardRepository(
      ref.watch(clientRepositoryProvider),
      ref.watch(taskRepositoryProvider),
    ));

/// Bumped after every local write and after a sync pull.
///
/// Reads from Hive are synchronous and in-memory, so instead of caching query
/// results per argument, screens watch this counter and re-read. It is the
/// same idea as invalidating a query cache, without a cache to keep coherent:
///
///   ref.watch(dataRevisionProvider);
///   final clients = ref.watch(clientRepositoryProvider).list(query);
final dataRevisionProvider = StateProvider<int>((ref) => 0);

extension DataRefresh on Ref {
  void bumpData() => read(dataRevisionProvider.notifier).state++;
}

extension DataRefreshWidget on WidgetRef {
  void bumpData() => read(dataRevisionProvider.notifier).state++;

  /// Re-reads local data on the next frame. Call after any mutation.
  void refreshData() => bumpData();
}

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final engine = SyncEngine(
    db: ref.watch(localDbProvider),
    clients: ref.watch(clientRepositoryProvider),
    tasks: ref.watch(taskRepositoryProvider),
    finance: ref.watch(financeRepositoryProvider),
    goals: ref.watch(goalRepositoryProvider),
    onChanged: () => ref.read(dataRevisionProvider.notifier).state++,
  );
  ref.onDispose(engine.dispose);
  return engine;
});

final syncStatusProvider = ChangeNotifierProvider<_SyncStatusListenable>((ref) {
  return _SyncStatusListenable(ref.watch(syncEngineProvider));
});

/// Bridges the engine's ValueNotifier into Riverpod so widgets can watch it.
class _SyncStatusListenable extends ChangeNotifier {
  _SyncStatusListenable(this._engine) {
    _engine.status.addListener(_forward);
  }

  final SyncEngine _engine;

  SyncStatus get status => _engine.status.value;

  void _forward() => notifyListeners();

  @override
  void dispose() {
    _engine.status.removeListener(_forward);
    super.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.user});
  final AuthStatus status;
  final User? user;
}

const _cachedUserKey = 'auth.user';

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState(status: AuthStatus.unknown));

  final Ref _ref;
  final _service = const AuthService();

  LocalDb get _db => _ref.read(localDbProvider);

  /// Decides whether there is a session, without requiring the network.
  ///
  /// A token plus a cached user is enough to open the app offline — the whole
  /// point of the local store is that the user can work on a plane. The
  /// server is asked to confirm in the background, and only an explicit 401
  /// (not a failed request) logs them out.
  Future<void> restore() async {
    final token = await TokenStorage.instance.read();
    if (token == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    final cached = _db.meta.get(_cachedUserKey);
    if (cached != null) {
      state = AuthState(status: AuthStatus.authenticated, user: User.fromJson(asJson(cached)));
    }

    try {
      final user = await _service.me();
      await _db.meta.put(_cachedUserKey, user.toJson());
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (error) {
      if (isUnauthorized(error)) {
        await _clearSession();
        return;
      }
      // Offline or the server is down: keep whatever session we had.
      if (state.status != AuthStatus.authenticated) {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    }
  }

  Future<void> login(String email, String password) async {
    final result = await _service.login(email, password);
    await _accept(result);
  }

  Future<void> register(String name, String email, String password) async {
    final result = await _service.register(name, email, password);
    await _accept(result);
  }

  Future<void> _accept(AuthResult result) async {
    await TokenStorage.instance.write(result.token);
    await _db.meta.put(_cachedUserKey, result.user.toJson());
    state = AuthState(status: AuthStatus.authenticated, user: result.user);
    _ref.read(syncEngineProvider).start();
    _ref.read(dataRevisionProvider.notifier).state++;
  }

  Future<void> logout() async {
    try {
      await _service.logout();
    } catch (_) {
      // Logging out locally must work even with no connection.
    }
    await _clearSession();
  }

  Future<void> _clearSession() async {
    await TokenStorage.instance.clear();
    await _ref.read(syncEngineProvider).reset();
    state = const AuthState(status: AuthStatus.unauthenticated);
    _ref.read(dataRevisionProvider.notifier).state++;
  }
}

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));

/* ------------------------------------------------------------------ */
/* Derived views                                                       */
/* ------------------------------------------------------------------ */

/// Everything the Home financial panel needs, derived from a single read of
/// the local ledger. Reading once and deriving keeps the panel, the chart and
/// the contas-a-pagar list from ever disagreeing with each other.
class FinanceOverview {
  const FinanceOverview({
    required this.entries,
    required this.series,
    required this.totals,
    required this.bills,
    required this.openBills,
  });

  final List<FinanceEntry> entries;

  /// One bucket per month, oldest first — what the Home chart plots.
  final List<MonthBucket> series;

  /// Current-month figures, for the panel above the chart.
  final FinanceTotals totals;
  final BillsSummary bills;

  /// Unpaid despesas, soonest due date first.
  final List<FinanceEntry> openBills;
}

const int homeChartMonths = 5;

FinanceOverview buildFinanceOverview(List<FinanceEntry> entries) {
  final openBills = entries
      .where((entry) => entry.kind == FinanceKind.expense && !entry.paid)
      .toList()
    ..sort((a, b) => a.date.compareTo(b.date));

  return FinanceOverview(
    entries: entries,
    series: buildMonthlySeries(entries, count: homeChartMonths),
    totals: totalsForMonth(entries),
    bills: summarizeBills(entries),
    openBills: openBills,
  );
}
