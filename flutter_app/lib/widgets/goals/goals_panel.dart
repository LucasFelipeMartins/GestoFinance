import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/remote/api_client.dart';
import '../../data/repositories/goal_repository.dart';
import '../../models/models.dart';
import '../../state/providers.dart';
import '../../theme/tokens.dart';
import '../../utils/formatters.dart';
import '../finance/finance_form.dart' show unawaitedSync;
import '../ui/basics.dart';
import '../ui/feedback.dart';
import '../ui/fields.dart';

/// Progress bars use the app's own accent rather than one of the three ledger
/// hues — verde, vermelho and azul mean lucro, gasto and investimento
/// everywhere else, and a goal is none of those.
const _goalAccent = AppColors.sageGreen;
const _goalDone = Color(0xFF2F6B34);

/// Metas: what the user is saving for, and how close they are.
///
/// Sits right under the chart on Home, because a goal is the one financial
/// number that is about the future rather than the past.
class GoalsPanel extends ConsumerWidget {
  const GoalsPanel({super.key, this.limit = 4});

  /// How many goals to show before offering "ver todas".
  final int limit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dataRevisionProvider);
    final goals = ref.watch(goalRepositoryProvider).list();
    final visible = goals.take(limit).toList();

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.flag_rounded, size: 19, color: _goalAccent),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text('Metas',
                            overflow: TextOverflow.ellipsis, style: AppText.h3),
                      ),
                    ]),
                    const SizedBox(height: 2),
                    Text(
                      goals.isEmpty
                          ? 'Defina um objetivo e acompanhe o quanto falta'
                          : '${goals.where((g) => !g.isComplete).length} em andamento · '
                              '${goals.where((g) => g.isComplete).length} concluída(s)',
                      style: AppText.caption,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AppButton(
                label: 'Nova meta',
                icon: Icons.add_rounded,
                compact: true,
                onPressed: () => showGoalForm(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (visible.isEmpty)
            _empty(context)
          else
            for (final progress in visible) ...[
              GoalCard(progress: progress),
              const SizedBox(height: 12),
            ],
          if (goals.length > visible.length)
            Text('+ ${goals.length - visible.length} outra(s) meta(s)', style: AppText.caption),
        ],
      ),
    );
  }

  Widget _empty(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.teaGreen.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.flag_rounded, size: 20, color: _goalAccent),
          ),
          const SizedBox(height: 12),
          Text(
            'Nenhuma meta ainda. Crie uma — "Viajar", R\$ 1.200, em 5 meses — e '
            'adicione valores quando quiser.',
            style: AppText.body.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          AppButton(
            label: 'Criar meta',
            icon: Icons.add_rounded,
            variant: AppButtonVariant.secondary,
            compact: true,
            onPressed: () => showGoalForm(context),
          ),
        ],
      ),
    );
  }
}

class GoalCard extends StatelessWidget {
  const GoalCard({super.key, required this.progress});

  final GoalProgress progress;

  @override
  Widget build(BuildContext context) {
    final goal = progress.goal;
    final done = progress.isComplete;
    final accent = done ? _goalDone : (progress.isOverdue ? AppColors.danger : _goalAccent);

    return InkWell(
      onTap: () => showGoalDetail(context, goal.id),
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.input),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
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
                              overflow: TextOverflow.ellipsis, style: AppText.bodyStrong),
                        ),
                        if (done) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.check_circle_rounded, size: 15, color: _goalDone),
                        ],
                      ]),
                      const SizedBox(height: 2),
                      Text(
                        done
                            ? 'Meta alcançada!'
                            : progress.isOverdue
                                ? 'Prazo venceu em ${formatDate(goal.targetDate)}'
                                : _deadlineLabel(progress),
                        overflow: TextOverflow.ellipsis,
                        style: AppText.caption.copyWith(
                          color: progress.isOverdue && !done
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
                    Text(formatCurrency(progress.saved), style: AppText.bodyStrong),
                    Text('de ${formatCurrency(goal.targetAmount)}', style: AppText.caption),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            GoalProgressBar(percent: progress.percent, color: accent),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  '${(progress.percent * 100).round()}%',
                  style: AppText.caption.copyWith(fontWeight: FontWeight.w700, color: accent),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    done
                        ? 'Nada mais a juntar'
                        : 'Faltam ${formatCurrency(progress.remaining)}',
                    overflow: TextOverflow.ellipsis,
                    style: AppText.caption,
                  ),
                ),
                if (!done)
                  AppButton(
                    label: 'Adicionar',
                    icon: Icons.add_rounded,
                    variant: AppButtonVariant.secondary,
                    compact: true,
                    onPressed: () => showAddContribution(context, progress),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _deadlineLabel(GoalProgress progress) {
    final months = progress.monthsLeft;
    final horizon = months == 0
        ? 'Vence ${formatRelativeDate(progress.goal.targetDate).toLowerCase()}'
        : months == 1
            ? 'Falta 1 mês'
            : 'Faltam $months meses';
    // The prazo raises an obvious question — answer it inline.
    return '$horizon · ${formatCurrency(progress.monthlyNeeded)}/mês';
  }
}

/// The bar itself: a rounded track with the filled portion animated, so a new
/// deposit visibly moves it rather than just snapping.
class GoalProgressBar extends StatelessWidget {
  const GoalProgressBar({super.key, required this.percent, required this.color, this.height = 10});

  final double percent;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Progresso da meta',
      value: '${(percent * 100).round()}%',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: percent.clamp(0.0, 1.0)),
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOutCubic,
          builder: (context, value, _) => LinearProgressIndicator(
            value: value,
            minHeight: height,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Create / edit                                                       */
/* ------------------------------------------------------------------ */

Future<void> showGoalForm(BuildContext context, {Goal? goal}) {
  return showAppSheet<void>(
    context,
    title: goal == null ? 'Nova meta' : 'Editar meta',
    builder: (context) => _GoalForm(goal: goal),
  );
}

class _GoalForm extends ConsumerStatefulWidget {
  const _GoalForm({this.goal});
  final Goal? goal;

  @override
  ConsumerState<_GoalForm> createState() => _GoalFormState();
}

class _GoalFormState extends ConsumerState<_GoalForm> {
  late final TextEditingController _title;
  late final TextEditingController _notes;
  late double _target;

  /// The form asks for a prazo in months, which is how people think about it;
  /// what gets stored is the resulting date, so it keeps meaning the same day
  /// as time passes.
  late int _months;
  DateTime? _explicitDate;

  final _errors = <String, String>{};
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final goal = widget.goal;
    _title = TextEditingController(text: goal?.title ?? '');
    _notes = TextEditingController(text: goal?.notes ?? '');
    _target = goal?.targetAmount ?? 0;
    _months = goal == null ? 5 : _monthsBetween(DateTime.now(), goal.targetDate);
    _explicitDate = goal?.targetDate;
  }

  static int _monthsBetween(DateTime from, DateTime to) {
    final months = (to.year - from.year) * 12 + (to.month - from.month);
    return months < 1 ? 1 : months;
  }

  DateTime get _targetDate {
    if (_explicitDate != null) return _explicitDate!;
    final now = DateTime.now();
    return DateTime(now.year, now.month + _months, now.day);
  }

  @override
  void dispose() {
    _title.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    _errors.clear();
    if (_title.text.trim().isEmpty) _errors['title'] = 'Dê um nome para a meta.';
    if (_target <= 0) _errors['target'] = 'Informe quanto você quer juntar.';
    setState(() {});
    if (_errors.isNotEmpty) return;

    setState(() => _submitting = true);
    final input = GoalFormInput(
      title: _title.text.trim(),
      targetAmount: _target,
      targetDate: _targetDate,
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    );

    try {
      final repository = ref.read(goalRepositoryProvider);
      if (widget.goal == null) {
        await repository.create(input);
      } else {
        await repository.update(widget.goal!.id, input);
      }
      ref.bumpData();
      unawaitedSync(ref);
      if (!mounted) return;
      Navigator.of(context).pop();
      showToast(context, widget.goal == null ? 'Meta criada.' : 'Meta atualizada.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showToast(context, apiErrorMessage(error, 'Não foi possível salvar a meta.'),
          tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppTextField(
          controller: _title,
          label: 'Meta',
          hintText: 'Ex: Viajar',
          error: _errors['title'],
        ),
        const SizedBox(height: 16),
        CurrencyField(
          label: 'Valor que quer juntar',
          value: _target,
          onChanged: (value) => setState(() => _target = value),
          error: _errors['target'],
        ),
        const SizedBox(height: 16),
        AppSegmentedControl<int>(
          label: 'Prazo',
          options: const [
            SegmentedOption(value: 3, label: '3 meses'),
            SegmentedOption(value: 5, label: '5 meses'),
            SegmentedOption(value: 12, label: '1 ano'),
            SegmentedOption(value: 24, label: '2 anos'),
          ],
          value: _months,
          onChanged: (value) => setState(() {
            _months = value;
            // Picking a preset replaces whatever exact date was there.
            _explicitDate = null;
          }),
        ),
        const SizedBox(height: 12),
        DateField(
          label: 'Ou uma data exata',
          value: _targetDate,
          onChanged: (value) => setState(() => _explicitDate = value),
        ),
        if (_target > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.teaGreen.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(AppRadius.input),
            ),
            child: Row(children: [
              const Icon(Icons.savings_outlined, size: 15, color: _goalAccent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Para chegar lá em ${formatDate(_targetDate)}, guarde cerca de '
                  '${formatCurrency(_target / _monthsToTarget)} por mês.',
                  style: AppText.caption,
                ),
              ),
            ]),
          ),
        ],
        const SizedBox(height: 16),
        AppTextField(
          controller: _notes,
          label: 'Observações',
          hintText: 'Opcional',
          maxLines: 2,
        ),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(
            child: AppButton(
              label: 'Cancelar',
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: _submitting ? null : () => Navigator.of(context).pop(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AppButton(
                label: 'Salvar', expand: true, isLoading: _submitting, onPressed: _submit),
          ),
        ]),
      ],
    );
  }

  int get _monthsToTarget {
    final months = _monthsBetween(DateTime.now(), _targetDate);
    return months < 1 ? 1 : months;
  }
}

/* ------------------------------------------------------------------ */
/* Add a deposit                                                       */
/* ------------------------------------------------------------------ */

/// "Adicionar um valor a qualquer momento" — the whole point of a goal.
Future<void> showAddContribution(BuildContext context, GoalProgress progress) {
  return showAppSheet<void>(
    context,
    title: 'Adicionar a "${progress.goal.title}"',
    builder: (context) => _ContributionForm(progress: progress),
  );
}

class _ContributionForm extends ConsumerStatefulWidget {
  const _ContributionForm({required this.progress});
  final GoalProgress progress;

  @override
  ConsumerState<_ContributionForm> createState() => _ContributionFormState();
}

class _ContributionFormState extends ConsumerState<_ContributionForm> {
  final _note = TextEditingController();
  double _amount = 0;
  DateTime _date = DateTime.now();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_amount <= 0) {
      setState(() => _error = 'Informe um valor maior que zero.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(goalRepositoryProvider).addContribution(
            widget.progress.goal.id,
            _amount,
            date: _date,
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      ref.bumpData();
      unawaitedSync(ref);

      if (!mounted) return;
      final after = ref.read(goalRepositoryProvider).get(widget.progress.goal.id);
      Navigator.of(context).pop();
      showToast(
        context,
        after != null && after.isComplete
            ? 'Meta "${widget.progress.goal.title}" alcançada! 🎉'
            : 'Valor adicionado. ${after == null ? '' : 'Faltam ${formatCurrency(after.remaining)}.'}',
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showToast(context, apiErrorMessage(error, 'Não foi possível adicionar o valor.'),
          tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final remaining = widget.progress.remaining;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CurrencyField(
          label: 'Valor',
          value: _amount,
          onChanged: (value) => setState(() => _amount = value),
          error: _error,
        ),
        const SizedBox(height: 10),
        // Two taps that cover most deposits, without hunting for the keypad.
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final preset in [50.0, 100.0, 200.0, 500.0])
            ActionChip(
              label: Text(formatCurrency(preset), style: AppText.caption),
              backgroundColor: AppColors.bgApp,
              side: const BorderSide(color: AppColors.border),
              onPressed: () => setState(() => _amount = _amount + preset),
            ),
          if (remaining > 0)
            ActionChip(
              label: Text('Faltante (${formatCurrency(remaining)})', style: AppText.caption),
              backgroundColor: AppColors.teaGreen.withValues(alpha: 0.4),
              side: const BorderSide(color: AppColors.border),
              onPressed: () => setState(() => _amount = remaining),
            ),
        ]),
        const SizedBox(height: 16),
        DateField(
          label: 'Data',
          value: _date,
          onChanged: (value) => setState(() => _date = value ?? _date),
        ),
        const SizedBox(height: 16),
        AppTextField(controller: _note, label: 'Nota', hintText: 'Opcional'),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(
            child: AppButton(
              label: 'Cancelar',
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: _submitting ? null : () => Navigator.of(context).pop(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AppButton(
                label: 'Adicionar', expand: true, isLoading: _submitting, onPressed: _submit),
          ),
        ]),
      ],
    );
  }
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

Future<void> showGoalDetail(BuildContext context, String goalId) {
  return showAppSheet<void>(
    context,
    title: 'Meta',
    builder: (context) => _GoalDetail(goalId: goalId),
  );
}

class _GoalDetail extends ConsumerWidget {
  const _GoalDetail({required this.goalId});
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dataRevisionProvider);
    final progress = ref.watch(goalRepositoryProvider).get(goalId);

    if (progress == null) {
      return Text('Meta não encontrada.', style: AppText.body.copyWith(color: AppColors.textSecondary));
    }

    final goal = progress.goal;
    final accent = progress.isComplete
        ? _goalDone
        : (progress.isOverdue ? AppColors.danger : _goalAccent);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(goal.title, style: AppText.h2),
        const SizedBox(height: 4),
        Text('Prazo: ${formatDate(goal.targetDate)}', style: AppText.caption),
        const SizedBox(height: 20),

        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(formatCurrency(progress.saved), style: AppText.display),
        ),
        Text('de ${formatCurrency(goal.targetAmount)}',
            style: AppText.body.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 12),
        GoalProgressBar(percent: progress.percent, color: accent, height: 12),
        const SizedBox(height: 8),
        Row(children: [
          Text('${(progress.percent * 100).round()}%',
              style: AppText.bodyStrong.copyWith(color: accent)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              progress.isComplete
                  ? 'Meta alcançada!'
                  : 'Faltam ${formatCurrency(progress.remaining)} · '
                      '${formatCurrency(progress.monthlyNeeded)}/mês',
              style: AppText.caption,
            ),
          ),
        ]),

        if (goal.notes != null) ...[
          const SizedBox(height: 16),
          Text(goal.notes!, style: AppText.body.copyWith(color: AppColors.textSecondary)),
        ],

        const SizedBox(height: 20),
        AppButton(
          label: 'Adicionar valor',
          icon: Icons.add_rounded,
          expand: true,
          onPressed: () {
            Navigator.of(context).pop();
            showAddContribution(context, progress);
          },
        ),
        const SizedBox(height: 20),

        Text('Depósitos', style: AppText.bodyStrong),
        const SizedBox(height: 8),
        if (progress.contributions.isEmpty)
          Text('Nenhum valor adicionado ainda.',
              style: AppText.caption)
        else
          for (final contribution in progress.contributions)
            _ContributionRow(contribution: contribution),

        const SizedBox(height: 20),
        Row(children: [
          Expanded(
            child: AppButton(
              label: 'Editar meta',
              icon: Icons.edit_outlined,
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: () {
                Navigator.of(context).pop();
                showGoalForm(context, goal: goal);
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AppButton(
              label: 'Remover',
              icon: Icons.delete_outline_rounded,
              variant: AppButtonVariant.danger,
              expand: true,
              onPressed: () async {
                final confirmed = await confirmDialog(
                  context,
                  title: 'Remover meta?',
                  description: 'A meta "${goal.title}" e todos os seus depósitos serão apagados.',
                );
                if (!confirmed) return;

                await ref.read(goalRepositoryProvider).remove(goal.id);
                ref.bumpData();
                unawaitedSync(ref);
                if (context.mounted) {
                  Navigator.of(context).pop();
                  showToast(context, 'Meta removida.');
                }
              },
            ),
          ),
        ]),
      ],
    );
  }
}

class _ContributionRow extends ConsumerWidget {
  const _ContributionRow({required this.contribution});
  final GoalContribution contribution;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(children: [
        const Icon(Icons.add_circle_outline_rounded, size: 16, color: _goalAccent),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(formatCurrency(contribution.amount), style: AppText.bodyStrong),
              Text(
                '${formatDate(contribution.date)}'
                '${contribution.note == null ? '' : ' · ${contribution.note}'}',
                overflow: TextOverflow.ellipsis,
                style: AppText.caption,
              ),
            ],
          ),
        ),
        AppIconButton(
          icon: Icons.close_rounded,
          tooltip: 'Remover este depósito',
          danger: true,
          onPressed: () async {
            await ref.read(goalRepositoryProvider).removeContribution(contribution.id);
            ref.bumpData();
            unawaitedSync(ref);
            if (context.mounted) showToast(context, 'Depósito removido.');
          },
        ),
      ]),
    );
  }
}
