import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../state/providers.dart';
import '../theme/tokens.dart';
import '../utils/formatters.dart';
import '../widgets/goals/goals_panel.dart';
import '../widgets/ui/basics.dart';
import '../widgets/ui/fields.dart';

enum _GoalFilter { all, open, done }

class GoalsScreen extends ConsumerStatefulWidget {
  const GoalsScreen({super.key, this.openFormOnEnter = false});

  final bool openFormOnEnter;

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends ConsumerState<GoalsScreen> {
  _GoalFilter _filter = _GoalFilter.all;

  @override
  void initState() {
    super.initState();
    if (widget.openFormOnEnter) {
      // The mobile "+" sheet routes here with ?new=1 rather than trying to
      // open a sheet across a navigation.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) showGoalForm(context);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(dataRevisionProvider);
    final all = ref.watch(goalRepositoryProvider).list();

    final visible = all.where((progress) => switch (_filter) {
          _GoalFilter.open => !progress.isComplete,
          _GoalFilter.done => progress.isComplete,
          _GoalFilter.all => true,
        }).toList();

    final open = all.where((g) => !g.isComplete).toList();
    final savedTotal = all.fold(0.0, (sum, g) => sum + g.saved);
    final targetTotal = all.fold(0.0, (sum, g) => sum + g.goal.targetAmount);
    // What every open goal needs this month, added up — the number that says
    // whether the whole set is realistic.
    final monthlyTotal = open.fold(0.0, (sum, g) => sum + g.monthlyNeeded);

    return PageBody(children: [
      PageHeader(
        title: 'Metas',
        subtitle: 'Defina um objetivo, um valor e um prazo — e adicione dinheiro quando quiser.',
        action: AppButton(
          label: 'Nova meta',
          icon: Icons.add_rounded,
          onPressed: () => showGoalForm(context),
        ),
      ),

      _stats(
        openCount: open.length,
        doneCount: all.length - open.length,
        savedTotal: savedTotal,
        targetTotal: targetTotal,
        monthlyTotal: monthlyTotal,
      ),

      if (all.isNotEmpty)
        SizedBox(
          width: 220,
          child: AppSelect<_GoalFilter>(
            value: _filter,
            options: const [
              SelectOption(value: _GoalFilter.all, label: 'Todas'),
              SelectOption(value: _GoalFilter.open, label: 'Em andamento'),
              SelectOption(value: _GoalFilter.done, label: 'Concluídas'),
            ],
            onChanged: (value) => setState(() => _filter = value ?? _GoalFilter.all),
          ),
        ),

      if (visible.isEmpty)
        EmptyState(
          icon: Icons.flag_outlined,
          title: all.isEmpty ? 'Nenhuma meta ainda' : 'Nenhuma meta neste filtro',
          description: all.isEmpty
              ? 'Crie uma meta — "Viajar", R\$ 1.200, em 5 meses — e adicione valores quando quiser.'
              : 'Troque o filtro para ver as outras metas.',
          action: all.isEmpty
              ? AppButton(
                  label: 'Criar meta',
                  icon: Icons.add_rounded,
                  onPressed: () => showGoalForm(context),
                )
              : AppButton(
                  label: 'Ver todas',
                  variant: AppButtonVariant.secondary,
                  onPressed: () => setState(() => _filter = _GoalFilter.all),
                ),
        )
      else
        LayoutBuilder(builder: (context, constraints) {
          final twoColumns = constraints.maxWidth >= 900;
          const gap = 16.0;
          final width = twoColumns ? (constraints.maxWidth - gap) / 2 : constraints.maxWidth;

          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: visible
                .map((progress) => SizedBox(width: width, child: _GoalPageCard(progress: progress)))
                .toList(),
          );
        }),
    ]);
  }

  Widget _stats({
    required int openCount,
    required int doneCount,
    required double savedTotal,
    required double targetTotal,
    required double monthlyTotal,
  }) {
    final tiles = [
      (
        icon: Icons.track_changes_rounded,
        label: 'Em andamento',
        value: '$openCount',
        caption: '$doneCount já concluída(s)',
      ),
      (
        icon: Icons.savings_rounded,
        label: 'Já guardado',
        value: formatCurrency(savedTotal),
        caption: 'de ${formatCurrency(targetTotal)} no total',
      ),
      (
        icon: Icons.flag_rounded,
        label: 'Precisa por mês',
        value: formatCurrency(monthlyTotal),
        caption: 'Somando todas as metas em aberto',
      ),
    ];

    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth >= 720 ? 3 : 1;
      const gap = 12.0;
      final width = (constraints.maxWidth - gap * (columns - 1)) / columns;

      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: tiles
            .map((tile) => SizedBox(
                  width: width,
                  child: AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(children: [
                          Expanded(
                            child: Text(
                              tile.label,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.caption.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE7F2E4),
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Icon(tile.icon, size: 18, color: AppColors.sageGreen),
                          ),
                        ]),
                        const SizedBox(height: 12),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(tile.value, style: AppText.h2),
                        ),
                        const SizedBox(height: 2),
                        Text(tile.caption, overflow: TextOverflow.ellipsis, style: AppText.caption),
                      ],
                    ),
                  ),
                ))
            .toList(),
      );
    });
  }
}

/// The full-size card the dedicated page uses — roomier than the Home row,
/// with the deposit count and the prazo spelled out.
class _GoalPageCard extends StatelessWidget {
  const _GoalPageCard({required this.progress});

  final GoalProgress progress;

  @override
  Widget build(BuildContext context) {
    final goal = progress.goal;
    final accent = progress.isComplete
        ? const Color(0xFF2F6B34)
        : (progress.isOverdue ? AppColors.danger : AppColors.sageGreen);

    final deadlineLabel = progress.isComplete
        ? 'Meta alcançada!'
        : progress.isOverdue
            ? 'Prazo venceu'
            : progress.monthsLeft == 0
                ? 'Vence ${formatRelativeDate(goal.targetDate).toLowerCase()}'
                : progress.monthsLeft == 1
                    ? 'Falta 1 mês'
                    : 'Faltam ${progress.monthsLeft} meses';

    return AppCard(
      onTap: () => showGoalDetail(context, goal.id),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Flexible(
                        child: Text(goal.title,
                            overflow: TextOverflow.ellipsis, style: AppText.h3),
                      ),
                      if (progress.isComplete) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.check_circle_rounded, size: 17, color: Color(0xFF2F6B34)),
                      ],
                    ]),
                    const SizedBox(height: 2),
                    Text(
                      '$deadlineLabel · ${formatDate(goal.targetDate)}',
                      overflow: TextOverflow.ellipsis,
                      style: AppText.caption.copyWith(
                        color: progress.isOverdue && !progress.isComplete
                            ? AppColors.danger
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(formatCurrency(progress.saved), style: AppText.h3),
                  Text('de ${formatCurrency(goal.targetAmount)}', style: AppText.caption),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),
          GoalProgressBar(percent: progress.percent, color: accent, height: 12),
          const SizedBox(height: 8),
          Row(children: [
            Text('${(progress.percent * 100).round()}%',
                style: AppText.bodyStrong.copyWith(color: accent)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                progress.isComplete
                    ? 'Nada mais a juntar'
                    : 'Faltam ${formatCurrency(progress.remaining)} · '
                        '${formatCurrency(progress.monthlyNeeded)}/mês',
                overflow: TextOverflow.ellipsis,
                style: AppText.caption,
              ),
            ),
          ]),

          if (goal.notes != null) ...[
            const SizedBox(height: 12),
            Text(goal.notes!,
                maxLines: 2, overflow: TextOverflow.ellipsis, style: AppText.caption),
          ],

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: Text(
                progress.contributions.isEmpty
                    ? 'Nenhum depósito ainda'
                    : '${progress.contributions.length} depósito'
                        '${progress.contributions.length > 1 ? 's' : ''}',
                overflow: TextOverflow.ellipsis,
                style: AppText.caption,
              ),
            ),
            if (!progress.isComplete)
              AppButton(
                label: 'Adicionar valor',
                icon: Icons.add_rounded,
                compact: true,
                onPressed: () => showAddContribution(context, progress),
              ),
            const SizedBox(width: 8),
            AppButton(
              label: 'Detalhes',
              variant: AppButtonVariant.secondary,
              compact: true,
              onPressed: () => showGoalDetail(context, goal.id),
            ),
          ]),
        ],
      ),
    );
  }
}
