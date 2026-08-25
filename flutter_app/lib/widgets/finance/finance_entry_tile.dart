import 'package:flutter/material.dart';

import '../../models/enums.dart';
import '../../models/models.dart';
import '../../theme/tokens.dart';
import '../../utils/finance_math.dart';
import '../../utils/formatters.dart';
import '../../utils/meta.dart';
import '../ui/basics.dart';
import '../ui/fields.dart';
import 'series_mark.dart';

/// Marks a receita that came from concluding a client rather than a form.
class AutoBadge extends StatelessWidget {
  const AutoBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Gerado automaticamente ao concluir o cliente',
      child: AppBadge(
        label: 'Automático',
        icon: Icons.auto_awesome_rounded,
        color: const Color(0xFF2F6B34),
        background: AppColors.financeIncomeSoft,
      ),
    );
  }
}

/// One row in a ledger. Same content on every screen size; wide layouts put
/// the metadata inline, narrow ones stack it under the description.
class FinanceEntryTile extends StatelessWidget {
  const FinanceEntryTile({
    super.key,
    required this.entry,
    this.onEdit,
    this.onDelete,
    this.onTogglePaid,
    this.onSimulate,
    this.onOpenClient,
  });

  final FinanceEntry entry;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onTogglePaid;
  final VoidCallback? onSimulate;
  final VoidCallback? onOpenClient;

  @override
  Widget build(BuildContext context) {
    final meta = financeMeta[entry.kind]!;
    final isExpense = entry.kind == FinanceKind.expense;
    final overdue = isBillOverdue(entry);
    final settled = isExpense && entry.paid;

    final chips = <Widget>[
      if (entry.isDerived) const AutoBadge(),
      if (overdue) const AppBadge(label: 'Vencida', tone: BadgeTone.danger),
      if (isExpense && !overdue)
        AppBadge(
          label: entry.paid ? 'Paga' : 'Em aberto',
          tone: entry.paid ? BadgeTone.success : BadgeTone.warning,
        ),
      if (entry.kind == FinanceKind.investment && entry.cdiPercent != null)
        AppBadge(label: '${entry.cdiPercent!.toStringAsFixed(0)}% do CDI'),
      if (entry.category != null) AppBadge(label: entry.category!),
    ];

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isExpense && onTogglePaid != null)
            AppCheckbox(
              value: entry.paid,
              onChanged: (_) => onTogglePaid!(),
              label: 'Marcar "${entry.description}" como paga',
              hideLabel: true,
            ),

          Expanded(
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
                          Text(
                            entry.description,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.bodyStrong.copyWith(
                              color: settled ? AppColors.textSecondary : AppColors.textPrimary,
                              decoration: settled ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              SeriesMarkKey(
                                  shape: meta.shape, color: meta.color, size: 10, withLine: false),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  '${meta.dateLabel} ${formatDate(entry.date)}'
                                  '${settled && entry.paidAt != null ? ' · paga em ${formatDate(entry.paidAt!)}' : ''}',
                                  overflow: TextOverflow.ellipsis,
                                  style: AppText.caption.copyWith(
                                    color: overdue ? AppColors.danger : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(formatCurrency(entry.amount), style: AppText.h3),
                        if (isExpense)
                          Text(describePayment(entry),
                              style: AppText.caption, textAlign: TextAlign.right),
                      ],
                    ),
                  ],
                ),

                if (entry.notes != null) ...[
                  const SizedBox(height: 6),
                  Text(entry.notes!,
                      maxLines: 2, overflow: TextOverflow.ellipsis, style: AppText.caption),
                ],

                if (chips.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(spacing: 6, runSpacing: 6, children: chips),
                ],
              ],
            ),
          ),

          _actions(context),
        ],
      ),
    );
  }

  Widget _actions(BuildContext context) {
    // A derived receita has no stored row to edit or delete — it mirrors the
    // client, so the only sensible action is to go there.
    if (entry.isDerived) {
      if (onOpenClient == null) return const SizedBox.shrink();
      return AppIconButton(
        icon: Icons.person_outline_rounded,
        tooltip: 'Abrir cliente',
        onPressed: onOpenClient,
      );
    }

    return PopupMenuButton<String>(
      tooltip: 'Ações',
      icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.textSecondary),
      onSelected: (value) => switch (value) {
        'edit' => onEdit?.call(),
        'simulate' => onSimulate?.call(),
        'delete' => onDelete?.call(),
        _ => null,
      },
      itemBuilder: (context) => [
        if (onEdit != null)
          const PopupMenuItem(
            value: 'edit',
            child: Row(children: [
              Icon(Icons.edit_outlined, size: 17),
              SizedBox(width: 10),
              Text('Editar'),
            ]),
          ),
        if (onSimulate != null && entry.kind == FinanceKind.investment)
          const PopupMenuItem(
            value: 'simulate',
            child: Row(children: [
              Icon(Icons.calculate_outlined, size: 17),
              SizedBox(width: 10),
              Text('Simular rendimento'),
            ]),
          ),
        if (onDelete != null)
          const PopupMenuItem(
            value: 'delete',
            child: Row(children: [
              Icon(Icons.delete_outline_rounded, size: 17, color: AppColors.danger),
              SizedBox(width: 10),
              Text('Remover', style: TextStyle(color: AppColors.danger)),
            ]),
          ),
      ],
    );
  }
}
