import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/remote/api_client.dart';
import '../../data/repositories/finance_repository.dart';
import '../../models/enums.dart';
import '../../models/models.dart';
import '../../state/providers.dart';
import '../../theme/tokens.dart';
import '../../utils/meta.dart';
import '../ui/basics.dart';
import '../ui/fields.dart';
import '../ui/feedback.dart';
import 'finance_entry_tile.dart';
import 'finance_form.dart';

class LedgerStat {
  const LedgerStat({required this.label, required this.value, this.caption, this.attention = false});
  final String label;
  final String value;
  final String? caption;

  /// Draws attention (used for vencidas).
  final bool attention;
}

/// The shared shell behind Lucros, Despesas and Investimentos. The three
/// screens are the same ledger filtered by `kind`, so they share one
/// implementation and differ only in their stats, copy and extras.
class LedgerScreen extends ConsumerStatefulWidget {
  const LedgerScreen({
    super.key,
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.stats,
    required this.emptyDescription,
    this.extra,
    this.onSimulate,
  });

  final FinanceKind kind;
  final String title;
  final String subtitle;

  /// Computed from every entry of this kind, so the strip keeps reporting the
  /// whole ledger while the list below is narrowed by filters.
  final List<LedgerStat> Function(List<FinanceEntry> entries) stats;
  final String emptyDescription;

  /// Extra content between the stats and the list (the simulator).
  final Widget? extra;
  final void Function(FinanceEntry entry)? onSimulate;

  @override
  ConsumerState<LedgerScreen> createState() => _LedgerScreenState();
}

class _LedgerScreenState extends ConsumerState<LedgerScreen> {
  final _searchController = TextEditingController();
  String _search = '';
  bool? _paidFilter;
  String _sort = 'date';
  bool _ascending = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool get _hasFilters => _search.isNotEmpty || _paidFilter != null;

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _search = '';
      _paidFilter = null;
    });
  }

  Future<void> _togglePaid(FinanceEntry entry) async {
    try {
      await ref.read(financeRepositoryProvider).setPaid(entry.id, !entry.paid);
      ref.bumpData();
      unawaitedSync(ref);
      if (mounted) {
        showToast(context, entry.paid ? 'Conta reaberta.' : 'Conta marcada como paga.');
      }
    } catch (error) {
      if (mounted) {
        showToast(context, apiErrorMessage(error, 'Não foi possível atualizar a conta.'),
            tone: ToastTone.error);
      }
    }
  }

  Future<void> _delete(FinanceEntry entry) async {
    final confirmed = await confirmDialog(
      context,
      title: 'Remover ${widget.kind.label.toLowerCase()}?',
      description: 'Essa ação não poderá ser desfeita para "${entry.description}".',
    );
    if (!confirmed) return;

    try {
      await ref.read(financeRepositoryProvider).remove(entry.id);
      ref.bumpData();
      unawaitedSync(ref);
      if (mounted) showToast(context, 'Lançamento removido.');
    } catch (error) {
      if (mounted) {
        showToast(context, apiErrorMessage(error, 'Não foi possível remover o lançamento.'),
            tone: ToastTone.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(dataRevisionProvider);
    final repository = ref.watch(financeRepositoryProvider);

    final all = repository.list(FinanceQuery(kind: widget.kind));
    final entries = repository.list(FinanceQuery(
      kind: widget.kind,
      search: _search.isEmpty ? null : _search,
      paid: _paidFilter,
      sort: _sort,
      ascending: _ascending,
    ));

    final meta = financeMeta[widget.kind]!;

    return PageBody(children: [
      PageHeader(
        title: widget.title,
        subtitle: widget.subtitle,
        action: AppButton(
          label: 'Adicionar ${widget.kind.label.toLowerCase()}',
          icon: Icons.add_rounded,
          onPressed: () => showFinanceForm(context, lockedKind: widget.kind),
        ),
      ),
      _statStrip(widget.stats(all), meta.color),
      if (widget.extra != null) widget.extra!,
      _filters(),
      if (entries.isEmpty)
        EmptyState(
          icon: Icons.account_balance_wallet_outlined,
          title: _hasFilters
              ? 'Nenhum lançamento encontrado'
              : 'Nenhum registro em ${widget.title.toLowerCase()}',
          description: _hasFilters
              ? 'Ajuste os filtros ou a busca para encontrar o que procura.'
              : widget.emptyDescription,
          action: _hasFilters
              ? AppButton(
                  label: 'Limpar filtros',
                  variant: AppButtonVariant.secondary,
                  onPressed: _clearFilters,
                )
              : AppButton(
                  label: 'Adicionar ${widget.kind.label.toLowerCase()}',
                  icon: Icons.add_rounded,
                  onPressed: () => showFinanceForm(context, lockedKind: widget.kind),
                ),
        )
      else
        Column(
          children: [
            for (final entry in entries) ...[
              FinanceEntryTile(
                entry: entry,
                onEdit: () => showFinanceForm(context, lockedKind: widget.kind, entry: entry),
                onDelete: () => _delete(entry),
                onTogglePaid: widget.kind == FinanceKind.expense ? () => _togglePaid(entry) : null,
                onSimulate: widget.onSimulate == null ? null : () => widget.onSimulate!(entry),
                onOpenClient: entry.clientId == null
                    ? null
                    : () => context.go('/clientes/${entry.clientId}'),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
    ]);
  }

  Widget _statStrip(List<LedgerStat> stats, Color accent) {
    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth >= 720 ? stats.length : 1;
      const gap = 12.0;
      final width = (constraints.maxWidth - gap * (columns - 1)) / columns;

      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: stats
            .map((stat) => SizedBox(
                  width: width,
                  child: AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          stat.label.toUpperCase(),
                          style: AppText.caption.copyWith(
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const SizedBox(height: 6),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            stat.value,
                            style: AppText.h2.copyWith(
                              color: stat.attention ? AppColors.dangerStrong : AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (stat.caption != null) ...[
                          const SizedBox(height: 2),
                          Text(stat.caption!, style: AppText.caption),
                        ],
                        const SizedBox(height: 12),
                        Container(
                          width: 36,
                          height: 2,
                          decoration: BoxDecoration(
                            color: accent,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ],
                    ),
                  ),
                ))
            .toList(),
      );
    });
  }

  Widget _filters() {
    final sortSelect = SizedBox(
      width: 190,
      child: AppSelect<String>(
        value: _sort,
        options: const [
          SelectOption(value: 'date', label: 'Data'),
          SelectOption(value: 'amount', label: 'Valor'),
          SelectOption(value: 'description', label: 'Descrição'),
          SelectOption(value: 'createdAt', label: 'Mais recentes'),
        ],
        onChanged: (value) => setState(() => _sort = value ?? 'date'),
      ),
    );

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        SizedBox(
          width: 320,
          child: SearchField(
            controller: _searchController,
            hintText: 'Buscar por descrição, categoria ou observação',
            onChanged: (value) => setState(() => _search = value),
          ),
        ),
        if (widget.kind == FinanceKind.expense)
          SizedBox(
            width: 170,
            child: AppSelect<String>(
              value: _paidFilter == null ? 'all' : (_paidFilter! ? 'paid' : 'open'),
              options: const [
                SelectOption(value: 'all', label: 'Todas'),
                SelectOption(value: 'open', label: 'Em aberto'),
                SelectOption(value: 'paid', label: 'Pagas'),
              ],
              onChanged: (value) => setState(() {
                _paidFilter = switch (value) {
                  'paid' => true,
                  'open' => false,
                  _ => null,
                };
              }),
            ),
          ),
        sortSelect,
        IconButton(
          onPressed: () => setState(() => _ascending = !_ascending),
          tooltip: _ascending ? 'Ordem crescente' : 'Ordem decrescente',
          icon: Icon(_ascending ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded),
          color: AppColors.textSecondary,
          style: IconButton.styleFrom(
            backgroundColor: AppColors.surface,
            side: const BorderSide(color: AppColors.border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.input)),
            minimumSize: const Size(48, 48),
          ),
        ),
        if (_hasFilters)
          TextButton.icon(
            onPressed: _clearFilters,
            icon: const Icon(Icons.close_rounded, size: 15),
            label: const Text('Limpar filtros'),
            style: TextButton.styleFrom(foregroundColor: AppColors.sageGreen),
          ),
      ],
    );
  }
}
