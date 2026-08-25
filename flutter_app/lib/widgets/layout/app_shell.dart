import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/sync/sync_engine.dart';
import '../../models/enums.dart';
import '../../state/providers.dart';
import '../../theme/tokens.dart';
import '../../utils/formatters.dart';
import '../finance/finance_form.dart';
import '../ui/basics.dart';
import '../ui/feedback.dart';

class NavItem {
  const NavItem({required this.route, required this.label, required this.icon, this.color});
  final String route;
  final String label;
  final IconData icon;
  final Color? color;
}

/// Two sections rather than one flat list: with six destinations, grouping
/// "o que você faz" apart from "quanto isso rende" keeps the sidebar
/// scannable instead of turning it into a wall of links.
const _navSections = <({String title, List<NavItem> items})>[
  (
    title: 'Operação',
    items: [
      NavItem(route: '/', label: 'Home', icon: Icons.home_rounded),
      NavItem(route: '/clientes', label: 'Clientes', icon: Icons.people_alt_rounded),
      NavItem(route: '/tarefas', label: 'Tarefas', icon: Icons.check_box_rounded),
    ],
  ),
  (
    title: 'Financeiro',
    items: [
      NavItem(
          route: '/lucros',
          label: 'Lucros',
          icon: Icons.trending_up_rounded,
          color: AppColors.financeIncome),
      NavItem(
          route: '/despesas',
          label: 'Despesas',
          icon: Icons.receipt_long_rounded,
          color: AppColors.financeExpense),
      NavItem(
          route: '/investimentos',
          label: 'Investimentos',
          icon: Icons.savings_rounded,
          color: AppColors.financeInvestment),
    ],
  ),
];

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final desktop = isDesktop(context);

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        top: false,
        child: Row(
          children: [
            if (desktop) const _Sidebar(),
            Expanded(
              child: Column(
                children: [
                  const _Header(),
                  Expanded(child: child),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: desktop ? null : const _BottomNav(),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Desktop sidebar                                                     */
/* ------------------------------------------------------------------ */

class _Sidebar extends ConsumerWidget {
  const _Sidebar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;

    return Container(
      width: 250,
      color: AppColors.evergreen,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.handshake_rounded, size: 22, color: AppColors.teaGreen),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('GestorPro',
                            style: AppText.h3.copyWith(color: Colors.white)),
                        Text('Clientes · Tarefas · Finanças',
                            overflow: TextOverflow.ellipsis,
                            style: AppText.caption
                                .copyWith(color: Colors.white.withValues(alpha: 0.6))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: SyncIndicator(onDark: true),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final section in _navSections) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                        child: Text(
                          section.title.toUpperCase(),
                          style: AppText.micro.copyWith(
                            color: Colors.white.withValues(alpha: 0.4),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      for (final item in section.items)
                        _SidebarLink(item: item, active: _isActive(location, item.route)),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _SidebarLink(
                    item: const NavItem(
                        route: '/configuracoes', label: 'Configurações', icon: Icons.settings_rounded),
                    active: _isActive(location, '/configuracoes'),
                  ),
                  _SidebarLink(
                    item: const NavItem(route: '', label: 'Sair', icon: Icons.logout_rounded),
                    active: false,
                    onTap: () => _confirmLogout(context, ref),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _isActive(String location, String route) =>
    route == '/' ? location == '/' : location.startsWith(route);

class _SidebarLink extends StatelessWidget {
  const _SidebarLink({required this.item, required this.active, this.onTap});

  final NavItem item;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Material(
        color: active ? AppColors.teaGreen : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap ?? () => context.go(item.route),
          borderRadius: BorderRadius.circular(12),
          hoverColor: Colors.white.withValues(alpha: 0.1),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            child: Row(
              children: [
                Icon(item.icon,
                    size: 19,
                    color: active ? AppColors.evergreen : Colors.white.withValues(alpha: 0.85)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodyStrong.copyWith(
                      color: active ? AppColors.evergreen : Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final desktop = isDesktop(context);
    final firstName = (user?.name ?? '').split(' ').first;

    return Container(
      padding: EdgeInsets.fromLTRB(
        desktop ? 32 : 16,
        desktop ? 24 : 16 + MediaQuery.paddingOf(context).top,
        desktop ? 32 : 16,
        desktop ? 20 : 12,
      ),
      decoration: const BoxDecoration(
        color: AppColors.bgApp,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Olá, $firstName!',
                  overflow: TextOverflow.ellipsis,
                  style: desktop ? AppText.h1 : AppText.h1Mobile,
                ),
                Text(
                  desktop
                      ? 'Clientes, tarefas e finanças em um só lugar.'
                      : formatWeekdayLong(DateTime.now()),
                  overflow: TextOverflow.ellipsis,
                  style: AppText.caption,
                ),
              ],
            ),
          ),
          if (!desktop) const SyncIndicator(compact: true),
          const SizedBox(width: 8),
          _UserMenu(name: user?.name ?? '', avatarUrl: user?.avatarUrl),
        ],
      ),
    );
  }
}

class _UserMenu extends ConsumerWidget {
  const _UserMenu({required this.name, this.avatarUrl});

  final String name;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      tooltip: 'Menu do usuário',
      offset: const Offset(0, 48),
      onSelected: (value) {
        if (value == 'settings') context.go('/configuracoes');
        if (value == 'logout') _confirmLogout(context, ref);
      },
      itemBuilder: (context) => const [
        PopupMenuItem(
          value: 'settings',
          child: Row(children: [
            Icon(Icons.settings_rounded, size: 17),
            SizedBox(width: 10),
            Text('Configurações'),
          ]),
        ),
        PopupMenuItem(
          value: 'logout',
          child: Row(children: [
            Icon(Icons.logout_rounded, size: 17, color: AppColors.danger),
            SizedBox(width: 10),
            Text('Sair', style: TextStyle(color: AppColors.danger)),
          ]),
        ),
      ],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppAvatar(name: name, initials: getInitials(name), imageUrl: avatarUrl, size: 36),
          if (isDesktop(context)) ...[
            const SizedBox(width: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 160),
              child: Text(name, overflow: TextOverflow.ellipsis, style: AppText.bodyStrong),
            ),
            const Icon(Icons.expand_more_rounded, size: 16, color: AppColors.textSecondary),
          ],
        ],
      ),
    );
  }
}

Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
  final confirmed = await confirmDialog(
    context,
    title: 'Sair da conta?',
    description: 'Os dados salvos neste aparelho serão apagados. '
        'Alterações ainda não sincronizadas serão perdidas.',
    confirmLabel: 'Sair',
  );
  if (!confirmed) return;
  await ref.read(authProvider.notifier).logout();
}

/* ------------------------------------------------------------------ */
/* Sync indicator                                                      */
/* ------------------------------------------------------------------ */

class SyncIndicator extends ConsumerWidget {
  const SyncIndicator({super.key, this.onDark = false, this.compact = false});

  final bool onDark;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider).status;

    final (icon, label, color) = _describe(status);
    final foreground = onDark ? Colors.white.withValues(alpha: 0.85) : color;

    if (compact) {
      return Tooltip(
        message: label,
        child: Icon(icon, size: 18, color: color),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: onDark ? AppColors.teaGreen : color),
        const SizedBox(width: 8),
        Flexible(
          child: Text(label,
              overflow: TextOverflow.ellipsis,
              style: AppText.caption.copyWith(color: foreground)),
        ),
      ],
    );
  }

  (IconData, String, Color) _describe(SyncStatus status) {
    if (!status.isOnline) {
      return (Icons.cloud_off_rounded, 'Offline · alterações salvas', AppColors.textSecondary);
    }
    if (status.isSyncing) {
      return (Icons.sync_rounded, 'Sincronizando...', AppColors.sageGreen);
    }
    if (status.pendingCount > 0) {
      return (
        Icons.cloud_upload_rounded,
        '${status.pendingCount} pendente${status.pendingCount > 1 ? 's' : ''}',
        AppColors.warning,
      );
    }
    if (status.lastError != null) {
      return (Icons.error_outline_rounded, 'Falha ao sincronizar', AppColors.danger);
    }
    return (Icons.cloud_done_rounded, 'Tudo sincronizado', AppColors.sageGreen);
  }
}

/* ------------------------------------------------------------------ */
/* Mobile bottom navigation                                            */
/* ------------------------------------------------------------------ */

class _BottomNav extends ConsumerWidget {
  const _BottomNav();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: [
              _NavTab(
                icon: Icons.home_rounded,
                label: 'Home',
                active: location == '/',
                onTap: () => context.go('/'),
              ),
              _NavTab(
                icon: Icons.people_alt_rounded,
                label: 'Clientes',
                active: location.startsWith('/clientes'),
                onTap: () => context.go('/clientes'),
              ),
              Expanded(
                child: Center(
                  child: Transform.translate(
                    offset: const Offset(0, -14),
                    child: Material(
                      color: AppColors.evergreen,
                      shape: const CircleBorder(),
                      elevation: 6,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: () => _showCreateSheet(context),
                        child: const SizedBox(
                          width: 54,
                          height: 54,
                          child: Icon(Icons.add_rounded, color: Colors.white, size: 26),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              _NavTab(
                icon: Icons.check_box_rounded,
                label: 'Tarefas',
                active: location.startsWith('/tarefas'),
                onTap: () => context.go('/tarefas'),
              ),
              _NavTab(
                icon: Icons.more_horiz_rounded,
                label: 'Mais',
                active: location.startsWith('/lucros') ||
                    location.startsWith('/despesas') ||
                    location.startsWith('/investimentos') ||
                    location.startsWith('/configuracoes'),
                onTap: () => _showMoreSheet(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({required this.icon, required this.label, required this.active, required this.onTap});

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.evergreen : AppColors.textSecondary;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 21, color: color),
            const SizedBox(height: 2),
            Text(label, style: AppText.micro.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}

Future<void> _showCreateSheet(BuildContext context) {
  return showAppSheet<void>(
    context,
    title: 'Adicionar',
    builder: (sheetContext) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SheetRow(
          icon: Icons.person_add_alt_rounded,
          label: 'Adicionar cliente',
          color: AppColors.sageGreen,
          onTap: () {
            Navigator.of(sheetContext).pop();
            context.go('/clientes?new=1');
          },
        ),
        _SheetRow(
          icon: Icons.playlist_add_rounded,
          label: 'Adicionar tarefa',
          color: AppColors.sageGreen,
          onTap: () {
            Navigator.of(sheetContext).pop();
            context.go('/tarefas?new=1');
          },
        ),
        for (final kind in FinanceKind.values)
          _SheetRow(
            icon: switch (kind) {
              FinanceKind.income => Icons.trending_up_rounded,
              FinanceKind.expense => Icons.receipt_long_rounded,
              FinanceKind.investment => Icons.savings_rounded,
            },
            label: 'Adicionar ${kind.label.toLowerCase()}',
            color: switch (kind) {
              FinanceKind.income => AppColors.financeIncome,
              FinanceKind.expense => AppColors.financeExpense,
              FinanceKind.investment => AppColors.financeInvestment,
            },
            onTap: () {
              Navigator.of(sheetContext).pop();
              showFinanceForm(context, lockedKind: kind);
            },
          ),
      ],
    ),
  );
}

Future<void> _showMoreSheet(BuildContext context, WidgetRef ref) {
  return showAppSheet<void>(
    context,
    title: 'Mais',
    builder: (sheetContext) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            const Icon(Icons.account_balance_wallet_rounded, size: 13, color: AppColors.textSecondary),
            const SizedBox(width: 6),
            Text('FINANCEIRO',
                style: AppText.caption.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.6)),
          ]),
        ),
        for (final item in _navSections[1].items)
          _SheetRow(
            icon: item.icon,
            label: item.label,
            color: item.color ?? AppColors.sageGreen,
            onTap: () {
              Navigator.of(sheetContext).pop();
              context.go(item.route);
            },
          ),
        const SizedBox(height: 8),
        _SheetRow(
          icon: Icons.settings_rounded,
          label: 'Configurações',
          color: AppColors.sageGreen,
          onTap: () {
            Navigator.of(sheetContext).pop();
            context.go('/configuracoes');
          },
        ),
        _SheetRow(
          icon: Icons.logout_rounded,
          label: 'Sair',
          color: AppColors.danger,
          onTap: () {
            Navigator.of(sheetContext).pop();
            _confirmLogout(context, ref);
          },
        ),
      ],
    ),
  );
}

class _SheetRow extends StatelessWidget {
  const _SheetRow({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 12),
              Expanded(child: Text(label, style: AppText.bodyStrong)),
            ],
          ),
        ),
      ),
    );
  }
}
