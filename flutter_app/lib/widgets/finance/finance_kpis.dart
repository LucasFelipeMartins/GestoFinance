import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/enums.dart';
import '../../theme/tokens.dart';
import '../../utils/finance_math.dart';
import '../../utils/formatters.dart';
import '../../utils/meta.dart';
import '../ui/basics.dart';
import 'series_mark.dart';

/// The headline panel: lucros, gastos e investimentos of the current month in
/// plain numbers, plus the resulting saldo.
///
/// The value itself always wears ink, never the series colour — the coloured
/// shape beside the label is what carries identity, matching the chart keys.
class FinanceKpis extends StatelessWidget {
  const FinanceKpis({super.key, required this.totals, required this.periodLabel});

  final FinanceTotals totals;
  final String periodLabel;

  @override
  Widget build(BuildContext context) {
    final positive = totals.net >= 0;

    final tiles = <Widget>[
      for (final kind in financeKindOrder)
        _Tile(
          label: kind.plural,
          value: formatCurrency(totals.valueFor(kind)),
          caption: periodLabel,
          icon: financeMeta[kind]!.icon,
          color: financeMeta[kind]!.color,
          soft: financeMeta[kind]!.soft,
          markKey: SeriesMarkKey(shape: financeMeta[kind]!.shape, color: financeMeta[kind]!.color),
          route: financeMeta[kind]!.route,
        ),
      _Tile(
        label: 'Saldo do mês',
        value: formatCurrency(totals.net),
        caption: positive ? 'Lucros acima dos gastos' : 'Gastos acima dos lucros',
        icon: positive ? Icons.account_balance_wallet_rounded : Icons.trending_down_rounded,
        color: positive ? const Color(0xFF3F7A3D) : AppColors.dangerStrong,
        soft: positive ? const Color(0xFFE7F2E4) : AppColors.financeExpenseSoft,
      ),
    ];

    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth >= kDesktopBreakpoint ? 4 : 2;
      const gap = 12.0;
      final tileWidth = (constraints.maxWidth - gap * (columns - 1)) / columns;

      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: tiles.map((tile) => SizedBox(width: tileWidth, child: tile)).toList(),
      );
    });
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.label,
    required this.value,
    required this.caption,
    required this.icon,
    required this.color,
    required this.soft,
    this.markKey,
    this.route,
  });

  final String label;
  final String value;
  final String caption;
  final IconData icon;
  final Color color;
  final Color soft;
  final Widget? markKey;
  final String? route;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: route == null ? null : () => context.go(route!),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (markKey != null) ...[markKey!, const SizedBox(width: 8)],
              Expanded(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.caption.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(11)),
                child: Icon(icon, size: 18, color: color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: AppText.h2),
          ),
          const SizedBox(height: 2),
          Text(caption, overflow: TextOverflow.ellipsis, style: AppText.caption),
        ],
      ),
    );
  }
}
