import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/tokens.dart';
import '../../utils/finance_math.dart';
import '../../utils/formatters.dart';
import '../ui/basics.dart';
import '../ui/fields.dart';

const _cdiKey = 'gestorpro.cdi-anual';

class SimulatorSeed {
  const SimulatorSeed({required this.amount, this.cdiPercent});
  final double amount;
  final double? cdiPercent;
}

/// "Quanto isso rende até o fim do mês?"
///
/// The percentual do CDI applies to the daily rate over 252 business days a
/// year — the market convention, and the reason the numbers here line up with
/// a bank's own projection instead of running high.
class InvestmentSimulator extends StatefulWidget {
  const InvestmentSimulator({super.key, this.seed});

  /// Prefill from an existing investimento ("Simular rendimento" na lista).
  final SimulatorSeed? seed;

  @override
  State<InvestmentSimulator> createState() => _InvestmentSimulatorState();
}

class _InvestmentSimulatorState extends State<InvestmentSimulator> {
  late final TextEditingController _annualCdi;
  late final TextEditingController _cdiPercent;
  double _principal = 1000;
  int _months = 1;
  bool _taxExempt = false;

  @override
  void initState() {
    super.initState();
    _annualCdi = TextEditingController(text: defaultAnnualCdi.toString().replaceAll('.', ','));
    _cdiPercent = TextEditingController(text: '100');
    _applySeed();
    _restoreCdi();
  }

  @override
  void didUpdateWidget(covariant InvestmentSimulator oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Re-seed when the user picks a different investimento from the list.
    if (widget.seed != oldWidget.seed) _applySeed();
  }

  void _applySeed() {
    final seed = widget.seed;
    if (seed == null) return;
    _principal = seed.amount;
    if (seed.cdiPercent != null) {
      _cdiPercent.text = seed.cdiPercent!.toStringAsFixed(0);
    }
  }

  Future<void> _restoreCdi() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getDouble(_cdiKey);
      if (stored != null && stored > 0 && mounted) {
        setState(() => _annualCdi.text = stored.toString().replaceAll('.', ','));
      }
    } catch (_) {
      // Storage blocked — the field still works, it just is not remembered.
    }
  }

  /// Shared with the Investimentos page, which uses the same rate for its
  /// portfolio estimate — one number the user maintains in one place.
  Future<void> _persistCdi(double value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (value > 0) await prefs.setDouble(_cdiKey, value);
    } catch (_) {/* see _restoreCdi */}
  }

  @override
  void dispose() {
    _annualCdi.dispose();
    _cdiPercent.dispose();
    super.dispose();
  }

  double get _annual => double.tryParse(_annualCdi.text.replaceAll(',', '.')) ?? defaultAnnualCdi;
  double get _percent => double.tryParse(_cdiPercent.text.replaceAll(',', '.')) ?? 100;

  @override
  Widget build(BuildContext context) {
    final result = simulateYield(
      principal: _principal,
      annualCdiPercent: _annual,
      cdiPercent: _percent,
      months: _months,
      taxExempt: _taxExempt,
    );

    final periodLabel = result.months == 1 ? 'no primeiro mês' : 'em ${result.months} meses';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.calculate_outlined, size: 19, color: AppColors.financeInvestment),
              const SizedBox(width: 8),
              const Expanded(child: Text('Simulador de rendimento', style: AppText.h3)),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            'Quanto um valor rende a um percentual do CDI, com juros compostos '
            'sobre $businessDaysPerMonth dias úteis por mês.',
            style: AppText.caption,
          ),
          const SizedBox(height: 20),

          _fields(),
          const SizedBox(height: 20),

          // The answer is one number — give it hero treatment, not a chart.
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.financeInvestmentSoft.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(color: AppColors.financeInvestment.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'RENDIMENTO LÍQUIDO $periodLabel'.toUpperCase(),
                  style: AppText.caption.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.4),
                ),
                const SizedBox(height: 4),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(formatCurrency(result.netYield), style: AppText.display),
                ),
                const SizedBox(height: 4),
                Text(
                  'Saldo final de ${formatCurrency(result.netBalance)} · '
                  '${formatRate(result.monthlyRate)} ao mês · '
                  '${formatRate(result.effectiveAnnualRate)} ao ano',
                  style: AppText.body.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          _breakdownRow('Valor aplicado', formatCurrency(result.principal)),
          _breakdownRow('Rendimento bruto', formatCurrency(result.grossYield)),
          _breakdownRow(
            'IR ${result.taxRate > 0 ? '(${formatRate(result.taxRate, digits: 1)})' : '(isento)'}',
            result.tax > 0 ? '− ${formatCurrency(result.tax)}' : formatCurrency(0),
          ),
          _breakdownRow('Saldo final', formatCurrency(result.netBalance)),

          if (result.months > 1) ...[
            const SizedBox(height: 20),
            _projection(result),
          ],

          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline_rounded, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Projeção estimada: assume o CDI constante no período e não considera IOF em '
                  'resgates com menos de 30 dias nem taxas da corretora.',
                  style: AppText.caption,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _fields() {
    return LayoutBuilder(builder: (context, constraints) {
      final twoColumns = constraints.maxWidth >= 560;
      const gap = 16.0;
      final width = twoColumns ? (constraints.maxWidth - gap) / 2 : constraints.maxWidth;

      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: [
          SizedBox(
            width: width,
            child: CurrencyField(
              label: 'Valor aplicado',
              value: _principal,
              onChanged: (value) => setState(() => _principal = value),
            ),
          ),
          SizedBox(
            width: width,
            child: AppTextField(
              controller: _annualCdi,
              label: 'CDI anual (%)',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              hint: 'A taxa CDI vigente, informada por você.',
              onChanged: (value) {
                setState(() {});
                final parsed = double.tryParse(value.replaceAll(',', '.'));
                if (parsed != null) _persistCdi(parsed);
              },
            ),
          ),
          SizedBox(
            width: width,
            child: AppTextField(
              controller: _cdiPercent,
              label: 'Rendimento da aplicação (% do CDI)',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              hint: 'Ex: 110 para um CDB que paga 110% do CDI.',
              onChanged: (_) => setState(() {}),
            ),
          ),
          SizedBox(
            width: width,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppSegmentedControl<int>(
                  label: 'Período',
                  options: const [
                    SegmentedOption(value: 1, label: '1 mês'),
                    SegmentedOption(value: 3, label: '3 meses'),
                    SegmentedOption(value: 6, label: '6 meses'),
                    SegmentedOption(value: 12, label: '12 meses'),
                  ],
                  value: _months,
                  onChanged: (value) => setState(() => _months = value),
                ),
                const SizedBox(height: 4),
                AppCheckbox(
                  value: _taxExempt,
                  onChanged: (value) => setState(() => _taxExempt = value),
                  label: 'Isento de IR (LCI, LCA, poupança)',
                ),
              ],
            ),
          ),
        ],
      );
    });
  }

  Widget _breakdownRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            Expanded(child: Text(label, style: AppText.body.copyWith(color: AppColors.textSecondary))),
            Text(value, style: AppText.bodyStrong),
          ],
        ),
      ),
    );
  }

  Widget _projection(YieldSimulation result) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 36,
        dataRowMinHeight: 36,
        dataRowMaxHeight: 42,
        columnSpacing: 24,
        columns: const [
          DataColumn(label: Text('Mês', style: AppText.caption)),
          DataColumn(numeric: true, label: Text('Rendimento acumulado', style: AppText.caption)),
          DataColumn(numeric: true, label: Text('Saldo bruto', style: AppText.caption)),
        ],
        rows: result.breakdown
            .map((row) => DataRow(cells: [
                  DataCell(Text('${row.month}º', style: AppText.body)),
                  DataCell(Text(formatCurrency(row.grossYield), style: AppText.body)),
                  DataCell(Text(formatCurrency(row.grossBalance), style: AppText.body)),
                ]))
            .toList(),
      ),
    );
  }
}
