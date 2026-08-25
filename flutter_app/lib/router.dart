import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/auth_screens.dart';
import 'screens/clients_screen.dart';
import 'screens/finance_screens.dart';
import 'screens/home_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/tasks_screen.dart';
import 'state/providers.dart';
import 'widgets/layout/app_shell.dart';

/// Bridges the auth state into go_router, which needs a Listenable rather
/// than a provider to know when to re-run its redirect.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(this._ref) {
    _ref.listen<AuthState>(authProvider, (previous, next) => notifyListeners());
  }

  final Ref _ref;
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = _AuthListenable(ref);
  ref.onDispose(listenable.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: listenable,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final path = state.uri.path;
      final isGuestRoute = path == '/entrar' || path == '/criar-conta';

      // Still restoring the session: hold wherever we are rather than
      // bouncing the user through the login screen and back.
      if (auth.status == AuthStatus.unknown) return null;

      if (auth.status == AuthStatus.unauthenticated) {
        return isGuestRoute ? null : '/entrar';
      }
      return isGuestRoute ? '/' : null;
    },
    routes: [
      GoRoute(path: '/entrar', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/criar-conta', builder: (context, state) => const RegisterScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(
            path: '/clientes',
            builder: (context, state) => ClientsScreen(
              openFormOnEnter: state.uri.queryParameters['new'] == '1',
            ),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) =>
                    ClientDetailsScreen(clientId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/tarefas',
            builder: (context, state) => TasksScreen(
              openFormOnEnter: state.uri.queryParameters['new'] == '1',
            ),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => TaskDetailsScreen(taskId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/lucros', builder: (context, state) => const IncomeScreen()),
          GoRoute(path: '/despesas', builder: (context, state) => const ExpensesScreen()),
          GoRoute(path: '/investimentos', builder: (context, state) => const InvestmentsScreen()),
          GoRoute(path: '/configuracoes', builder: (context, state) => const SettingsScreen()),
        ],
      ),
    ],
  );
});
