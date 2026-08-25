import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/remote/api_client.dart';
import '../../models/models.dart';
import '../../state/providers.dart';
import '../../theme/tokens.dart';
import '../../models/enums.dart';
import '../../utils/finance_math.dart';
import '../../utils/formatters.dart';
import '../ui/basics.dart';
import '../ui/fields.dart';
import '../ui/feedback.dart';
import 'finance_form.dart';

/// Contas a pagar, right on Home: what is still open, what is already late,
/// and a one-tap way to add another or tick one off as paid.
class BillsPanel extends ConsumerWidget {
  const BillsPanel({super.key, required this.bills, required this.summary, this.limit = 6});

  final List<FinanceEntry> bills;
  final BillsSummary summary;

  /// How many rows to show before deferring to the Despesas page.
  final int limit;

  Future<void> _togglePaid(BuildContext context, WidgetRef ref, FinanceEntry entry) async {
    try {
      await ref.read(financeRepositoryProvider).setPaid(entry.id, !entry.paid);
      ref.bumpData();
      unawaitedSync(ref);
      if (context.mounted) {
        showToast(context, entry.paid ? 'Conta reaberta.' : 'Conta marcada como paga.');
      }
    } catch (error) {
      if (context.mounted) {
        showToast(context, apiErrorMessage(error, 'Não foi possível atualizar a conta.'),
            tone: ToastTone.error);
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visible = bills.take(limit).toList();

    return AppCard(
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
                    Row(
                      children: [
                        const Icon(Icons.receipt_long_rounded,
                            size: 19, color: AppColors.financeExpense),
                        const SizedBox(width: 8),
                        Flexible(
                            child: Text('Contas a pagar',
                                style: AppText.h3, overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      summary.openCount == 0
                          ? 'Nada em aberto no momento'
                          : '${formatCurrency(summary.openTotal)} em ${summary.openCount} '
                              'conta${summary.openCount > 1 ? 's' : ''}',
                      style: AppText.caption,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AppButton(
                label: 'Adicionar',
                icon: Icons.add_rounded,
                compact: true,
                onPressed: () => showFinanceForm(context, lockedKind: FinanceKind.expense),
              ),
            ],
          ),

          if (summary.overdueCount > 0 || summary.dueSoonCount > 0) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (summary.overdueCount > 0)
                  AppBadge(
                    tone: BadgeTone.danger,
                    label: '${summary.overdueCount} vencida${summary.overdueCount > 1 ? 's' : ''} · '
                        '${formatCurrency(summary.overdueTotal)}',
                  ),
                if (summary.dueSoonCount > 0)
                  AppBadge(
                    tone: BadgeTone.warning,
                    label: '${summary.dueSoonCount} vence(m) em 7 dias',
                  ),
              ],
            ),
          ],

          const SizedBox(height: 12),

          if (visible.isEmpty)
            _empty(context)
          else
            ...visible.map((entry) => _row(context, ref, entry)),

          if (bills.length > visible.length) ...[
            const SizedBox(height: 12),
            InkWell(
              onTap: () => context.go('/despesas'),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Ver todas as ${bills.length} contas',
                      style: AppText.bodyStrong.copyWith(color: AppColors.sageGreen)),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward_rounded, size: 15, color: AppColors.sageGreen),
                ],
              ),
            ),
          ],
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
            decoration: const BoxDecoration(
                color: AppColors.financeExpenseSoft, shape: BoxShape.circle),
            child: const Icon(Icons.receipt_long_rounded,
                size: 20, color: AppColors.financeExpense),
          ),
          const SizedBox(height: 12),
          Text(
            'Nenhuma conta em aberto. Adicione o que precisa ser pago para não perder o prazo.',
            style: AppText.body.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          AppButton(
            label: 'Adicionar conta',
            icon: Icons.add_rounded,
            variant: AppButtonVariant.secondary,
            compact: true,
            onPressed: () => showFinanceForm(context, lockedKind: FinanceKind.expense),
          ),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, WidgetRef ref, FinanceEntry entry) {
    final overdue = isBillOverdue(entry);
    final byCard = entry.paymentMethod == PaymentMethod.card;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          AppCheckbox(
            value: entry.paid,
            onChanged: (_) => _togglePaid(context, ref, entry),
            label: 'Marcar "${entry.description}" como paga',
            hideLabel: true,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.description,
                    overflow: TextOverflow.ellipsis, style: AppText.bodyStrong),
                Row(
                  children: [
                    Icon(byCard ? Icons.credit_card_rounded : Icons.pix_rounded,
                        size: 12, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(describePayment(entry),
                          overflow: TextOverflow.ellipsis, style: AppText.caption),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatCurrency(entry.amount), style: AppText.bodyStrong),
              Text(
                overdue ? 'Vencida' : formatRelativeDate(entry.date),
                style: AppText.caption.copyWith(
                  color: overdue ? AppColors.danger : AppColors.textSecondary,
                  fontWeight: overdue ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
          AppIconButton(
            icon: Icons.edit_outlined,
            tooltip: 'Editar ${entry.description}',
            onPressed: () => showFinanceForm(context, lockedKind: FinanceKind.expense, entry: entry),
          ),
        ],
      ),
    );
  }
}
