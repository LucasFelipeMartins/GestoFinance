import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/enums.dart';
import '../models/models.dart';
import '../utils/finance_math.dart';
import '../utils/formatters.dart';
import '../widgets/finance/investment_simulator.dart';
import '../widgets/finance/ledger_screen.dart';

class IncomeScreen extends StatelessWidget {
  const IncomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LedgerScreen(
      kind: FinanceKind.income,
      title: 'Lucros',
      subtitle: 'Clientes concluídos entram aqui sozinhos. Lance à mão o que vem de fora — '
          'vendas, salários e outras entradas.',
      emptyDescription:
          'Conclua um cliente ou lance uma entrada manual para começar a acompanhar seus lucros.',
      stats: (entries) {
        // Two sources, reported separately so it is always clear where the
        // money came from: clients concluded, and everything typed by hand.
        final fromClients = entries.where((e) => e.isDerived).toList();
        final manual = entries.where((e) => !e.isDerived).toList();

        return [
          LedgerStat(
            label: 'Recebido este mês',
            value: formatCurrency(totalsForMonth(entries).income),
          ),
          LedgerStat(
            label: 'De clientes concluídos',
            value: formatCurrency(sumAmounts(fromClients)),
            caption: '${fromClients.length} cliente${fromClients.length == 1 ? '' : 's'} · automático',
          ),
          LedgerStat(
            label: 'Lançado manualmente',
            value: formatCurrency(sumAmounts(manual)),
            caption: '${manual.length} lançamento${manual.length == 1 ? '' : 's'}',
          ),
        ];
      },
    );
  }
}

class ExpensesScreen extends StatelessWidget {
  const ExpensesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LedgerScreen(
      kind: FinanceKind.expense,
      title: 'Despesas',
      subtitle: 'Tudo que precisa ser pago. Marque como paga, informe pix ou cartão e, '
          'no cartão, as parcelas.',
      emptyDescription: 'Cadastre o que precisa ser pago para não perder nenhum vencimento.',
      stats: (entries) {
        final bills = summarizeBills(entries);
        return [
          LedgerStat(
            label: 'Em aberto',
            value: formatCurrency(bills.openTotal),
            caption: bills.openCount == 0
                ? 'Nada pendente'
                : '${bills.openCount} conta${bills.openCount == 1 ? '' : 's'}'
                    '${bills.dueSoonCount > 0 ? ' · ${bills.dueSoonCount} vence(m) em 7 dias' : ''}',
          ),
          LedgerStat(
            label: 'Vencidas',
            value: formatCurrency(bills.overdueTotal),
            caption: bills.overdueCount == 0
                ? 'Nenhuma conta atrasada'
                : '${bills.overdueCount} conta${bills.overdueCount == 1 ? '' : 's'} atrasada'
                    '${bills.overdueCount == 1 ? '' : 's'}',
            attention: bills.overdueCount > 0,
          ),
          LedgerStat(
            label: 'Comprometido no mês',
            value: formatCurrency(totalsForMonth(entries).expense),
            caption: 'Inclui a parcela do mês das compras no cartão',
          ),
        ];
      },
    );
  }
}

class InvestmentsScreen extends ConsumerStatefulWidget {
  const InvestmentsScreen({super.key});

  @override
  ConsumerState<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends ConsumerState<InvestmentsScreen> {
  /// Set by "Simular rendimento" on a row, so the simulator opens already
  /// filled with that application's value and percentual do CDI.
  SimulatorSeed? _seed;
  double _annualCdi = defaultAnnualCdi;

  @override
  void initState() {
    super.initState();
    _loadCdi();
  }

  Future<void> _loadCdi() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getDouble('gestorpro.cdi-anual');
      if (stored != null && stored > 0 && mounted) setState(() => _annualCdi = stored);
    } catch (_) {/* the default is fine */}
  }

  @override
  Widget build(BuildContext context) {
    return LedgerScreen(
      kind: FinanceKind.investment,
      title: 'Investimentos',
      subtitle: 'Onde o dinheiro está aplicado e quanto ele rende a um determinado '
          'percentual do CDI.',
      emptyDescription:
          'Cadastre suas aplicações para acompanhar o total investido e simular o rendimento.',
      extra: InvestmentSimulator(seed: _seed),
      onSimulate: (entry) => setState(() {
        _seed = SimulatorSeed(amount: entry.amount, cdiPercent: entry.cdiPercent);
      }),
      stats: (entries) => _stats(entries),
    );
  }

  List<LedgerStat> _stats(List<FinanceEntry> entries) {
    return [
      LedgerStat(
        label: 'Total investido',
        value: formatCurrency(sumAmounts(entries)),
        caption: '${entries.length} aplicaç${entries.length == 1 ? 'ão' : 'ões'}',
      ),
      LedgerStat(
        label: 'Aplicado este mês',
        value: formatCurrency(totalsForMonth(entries).investment),
      ),
      LedgerStat(
        label: 'Rendimento estimado / mês',
        value: formatCurrency(estimateMonthlyYield(entries, _annualCdi)),
        caption: 'Bruto, com CDI a ${_annualCdi.toString().replaceAll('.', ',')}% ao ano',
      ),
    ];
  }
}
