import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/repositories/finance_repository.dart';
import '../models/models.dart';
import '../state/providers.dart';
import '../theme/tokens.dart';
import '../utils/formatters.dart';
import '../widgets/finance/bills_panel.dart';
import '../widgets/finance/finance_chart.dart';
import '../widgets/finance/finance_kpis.dart';
import '../widgets/goals/goals_panel.dart';
import '../widgets/ui/basics.dart';
import 'tasks_screen.dart' show TaskTile;
import 'clients_screen.dart' show ClientTile;

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dataRevisionProvider);

    final overview = buildFinanceOverview(
      ref.watch(financeRepositoryProvider).list(const FinanceQuery()),
    );
    final summary = ref.watch(dashboardRepositoryProvider).summary();
    final currentMonth = formatMonthLong(DateTime.now());

    return PageBody(children: [
      PageHeader(
        eyebrow: currentMonth,
        title: 'Resumo',
        subtitle: 'Visão geral da operação e das finanças',
      ),

      FinanceKpis(totals: overview.totals, periodLabel: currentMonth),

      // Chart and contas a pagar share a row on wide screens; the chart needs
      // the width, the bills panel is happy narrow.
      LayoutBuilder(builder: (context, constraints) {
        final chart = AppCard(child: FinanceChart(series: overview.series));
        final bills = BillsPanel(bills: overview.openBills, summary: overview.bills);

        if (constraints.maxWidth < 1180) {
          return Column(children: [chart, const SizedBox(height: 20), bills]);
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 16, child: chart),
            const SizedBox(width: 20),
            Expanded(flex: 10, child: bills),
          ],
        );
      }),

      const GoalsPanel(),

      _OperationSummary(clients: summary.clients, tasks: summary.tasks),

      LayoutBuilder(builder: (context, constraints) {
        final recentClients = _RecentClients(clients: summary.recentClients);
        final recentTasks = _RecentTasks(tasks: summary.recentTasks);

        if (constraints.maxWidth < 900) {
          return Column(children: [recentClients, const SizedBox(height: 20), recentTasks]);
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: recentClients),
            const SizedBox(width: 20),
            Expanded(child: recentTasks),
          ],
        );
      }),
    ]);
  }
}

/// Clientes e tarefas condensed into a single card.
///
/// The financial tiles above already own the top of Home; giving the
/// operational numbers four more full cards would double the tile count for
/// no extra information.
class _OperationSummary extends StatelessWidget {
  const _OperationSummary({required this.clients, required this.tasks});

  final DashboardCounts clients;
  final DashboardCounts tasks;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        icon: Icons.people_alt_rounded,
        label: 'Clientes',
        value: clients.total,
        caption: '${clients.completed} concluídos',
        route: '/clientes',
        attention: false,
      ),
      (
        icon: Icons.checklist_rounded,
        label: 'Tarefas',
        value: tasks.total,
        caption: '${tasks.completed} concluídas',
        route: '/tarefas',
        attention: false,
      ),
      (
        icon: Icons.schedule_rounded,
        label: 'Pendentes',
        value: tasks.pending + tasks.inProgress,
        caption: '${tasks.inProgress} em andamento',
        route: '/tarefas',
        attention: false,
      ),
      (
        icon: Icons.warning_amber_rounded,
        label: 'Vencidas',
        value: tasks.overdue,
        caption: tasks.overdue > 0 ? 'Precisam de atenção' : 'Tudo em dia',
        route: '/tarefas',
        attention: tasks.overdue > 0,
      ),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Expanded(child: Text('Operação', style: AppText.h3)),
            InkWell(
              onTap: () => context.go('/tarefas'),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text('Ver tarefas',
                    style: AppText.bodyStrong.copyWith(color: AppColors.sageGreen)),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_rounded, size: 15, color: AppColors.sageGreen),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          LayoutBuilder(builder: (context, constraints) {
            final wide = constraints.maxWidth >= 620;
            final columns = wide ? 4 : 2;
            const gap = 16.0;
            final ringWidth = wide ? 150.0 : 0.0;
            final available = constraints.maxWidth - (wide ? ringWidth + gap : 0);
            final width = (available - gap * (columns - 1)) / columns;

            final tiles = items
                .map((item) => SizedBox(
                      width: width,
                      child: InkWell(
                        onTap: () => context.go(item.route),
                        borderRadius: BorderRadius.circular(AppRadius.input),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Icon(item.icon, size: 16, color: AppColors.sageGreen),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(item.label,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppText.caption
                                        .copyWith(fontWeight: FontWeight.w600)),
                              ),
                            ]),
                            const SizedBox(height: 4),
                            Text('${item.value}', style: AppText.h2),
                            Text(
                              item.caption,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.caption.copyWith(
                                color: item.attention ? AppColors.danger : AppColors.textSecondary,
                                fontWeight: item.attention ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ))
                .toList();

            final ring = Row(mainAxisSize: MainAxisSize.min, children: [
              PercentRing(value: tasks.completionRate),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Conclusão', style: AppText.bodyStrong),
                Text('das tarefas', style: AppText.caption),
              ]),
            ]);

            return Wrap(
              spacing: gap,
              runSpacing: gap,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [...tiles, ring],
            );
          }),
        ],
      ),
    );
  }
}

class _RecentClients extends StatelessWidget {
  const _RecentClients({required this.clients});
  final List<Client> clients;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.people_alt_rounded, size: 19, color: AppColors.sageGreen),
            const SizedBox(width: 8),
            const Expanded(child: Text('Clientes recentes', style: AppText.h3)),
            InkWell(
              onTap: () => context.go('/clientes'),
              child: Text('Ver todos',
                  style: AppText.bodyStrong.copyWith(color: AppColors.sageGreen)),
            ),
          ]),
          const SizedBox(height: 12),
          if (clients.isEmpty)
            Text('Nenhum cliente cadastrado ainda.',
                style: AppText.body.copyWith(color: AppColors.textSecondary))
          else
            for (final client in clients)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ClientTile(client: client, onTap: () => context.go('/clientes/${client.id}')),
              ),
        ],
      ),
    );
  }
}

/// The open half of the workload. Home only ever gets tasks that are still
/// pending or in progress (see DashboardRepository) — checking one off makes
/// it leave this list at once and finish its last 24h on the Tarefas screen.
class _RecentTasks extends StatelessWidget {
  const _RecentTasks({required this.tasks});
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.checklist_rounded, size: 19, color: AppColors.sageGreen),
            const SizedBox(width: 8),
            const Expanded(child: Text('Tarefas pendentes', style: AppText.h3)),
            InkWell(
              onTap: () => context.go('/tarefas'),
              child: Text('Ver todas',
                  style: AppText.bodyStrong.copyWith(color: AppColors.sageGreen)),
            ),
          ]),
          const SizedBox(height: 12),
          if (tasks.isEmpty)
            Text('Nenhuma tarefa pendente. Tudo em dia!',
                style: AppText.body.copyWith(color: AppColors.textSecondary))
          else
            for (final task in tasks)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TaskTile(task: task, onTap: () => context.go('/tarefas/${task.id}')),
              ),
        ],
      ),
    );
  }
}
