import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/remote/api_client.dart';
import '../../data/repositories/finance_repository.dart';
import '../../models/enums.dart';
import '../../models/models.dart';
import '../../state/providers.dart';
import '../../theme/tokens.dart';
import '../../utils/formatters.dart';
import '../../utils/meta.dart';
import '../ui/basics.dart';
import '../ui/fields.dart';
import '../ui/feedback.dart';

/// Opens the create/edit form for a lançamento. [lockedKind] hides the tipo
/// picker when the page already decided it.
Future<void> showFinanceForm(
  BuildContext context, {
  FinanceKind? lockedKind,
  FinanceEntry? entry,
}) {
  final kind = entry?.kind ?? lockedKind;
  final label = kind == null ? 'lançamento' : kind.label.toLowerCase();

  return showAppSheet<void>(
    context,
    title: entry == null ? 'Adicionar $label' : 'Editar $label',
    builder: (context) => _FinanceForm(lockedKind: lockedKind, entry: entry),
  );
}

class _FinanceForm extends ConsumerStatefulWidget {
  const _FinanceForm({this.lockedKind, this.entry});

  final FinanceKind? lockedKind;
  final FinanceEntry? entry;

  @override
  ConsumerState<_FinanceForm> createState() => _FinanceFormState();
}

class _FinanceFormState extends ConsumerState<_FinanceForm> {
  late FinanceKind _kind;
  late final TextEditingController _description;
  late final TextEditingController _category;
  late final TextEditingController _notes;
  late final TextEditingController _cdi;

  late double _amount;
  late DateTime _date;
  late bool _paid;
  late PaymentMethod _paymentMethod;
  late int _installments;

  final _errors = <String, String>{};
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final entry = widget.entry;
    _kind = entry?.kind ?? widget.lockedKind ?? FinanceKind.expense;
    _description = TextEditingController(text: entry?.description ?? '');
    _category = TextEditingController(text: entry?.category ?? '');
    _notes = TextEditingController(text: entry?.notes ?? '');
    _cdi = TextEditingController(text: (entry?.cdiPercent ?? 100).toStringAsFixed(0));
    _amount = entry?.amount ?? 0;
    _date = entry?.date ?? DateTime.now();
    _paid = entry?.paid ?? false;
    _paymentMethod = entry?.paymentMethod ?? PaymentMethod.pix;
    _installments = entry?.installments ?? 1;
  }

  @override
  void dispose() {
    _description.dispose();
    _category.dispose();
    _notes.dispose();
    _cdi.dispose();
    super.dispose();
  }

  bool _validate() {
    _errors.clear();

    if (_description.text.trim().isEmpty) {
      _errors['description'] = 'A descrição é obrigatória.';
    }
    if (_amount <= 0) {
      _errors['amount'] = 'Informe um valor maior que zero.';
    }
    if (_kind == FinanceKind.investment) {
      final cdi = double.tryParse(_cdi.text.replaceAll(',', '.'));
      // Required rather than optional: it drives the simulator and the
      // portfolio estimate.
      if (cdi == null || cdi < 0) {
        _errors['cdi'] = 'Informe quanto do CDI a aplicação rende.';
      }
    }

    setState(() {});
    return _errors.isEmpty;
  }

  Future<void> _submit() async {
    if (!_validate()) return;

    setState(() => _submitting = true);
    final repository = ref.read(financeRepositoryProvider);
    final isEditing = widget.entry != null;

    final input = FinanceFormInput(
      kind: _kind,
      description: _description.text.trim(),
      amount: _amount,
      date: _date,
      category: _category.text.trim().isEmpty ? null : _category.text.trim(),
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      paid: _kind == FinanceKind.expense ? _paid : false,
      paymentMethod: _kind == FinanceKind.expense ? _paymentMethod : null,
      installments: _kind == FinanceKind.expense ? _installments : null,
      cdiPercent: _kind == FinanceKind.investment
          ? double.tryParse(_cdi.text.replaceAll(',', '.'))
          : null,
    );

    try {
      if (isEditing) {
        await repository.update(widget.entry!.id, input);
      } else {
        await repository.create(input);
      }
      ref.bumpData();
      // Fire and forget: the write is already safe locally.
      unawaitedSync(ref);

      if (!mounted) return;
      Navigator.of(context).pop();
      showToast(context, isEditing ? 'Lançamento atualizado.' : 'Lançamento criado.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showToast(
        context,
        apiErrorMessage(error, 'Não foi possível salvar o lançamento.'),
        tone: ToastTone.error,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final meta = financeMeta[_kind]!;
    final isExpense = _kind == FinanceKind.expense;
    final isInvestment = _kind == FinanceKind.investment;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.lockedKind == null && widget.entry == null) ...[
          AppSegmentedControl<FinanceKind>(
            label: 'Tipo de lançamento',
            options: financeKindOrder
                .map((kind) => SegmentedOption(value: kind, label: kind.label))
                .toList(),
            value: _kind,
            onChanged: (kind) => setState(() => _kind = kind),
            activeColor: meta.color,
            activeBackground: meta.soft,
          ),
          const SizedBox(height: 16),
        ],

        AppTextField(
          controller: _description,
          label: 'Descrição',
          hintText: switch (_kind) {
            FinanceKind.expense => 'Ex: Conta de luz',
            FinanceKind.investment => 'Ex: CDB Banco X',
            FinanceKind.income => 'Ex: Venda de peças',
          },
          error: _errors['description'],
        ),
        const SizedBox(height: 16),

        CurrencyField(
          label: isExpense ? 'Valor total' : 'Valor',
          value: _amount,
          onChanged: (value) => setState(() => _amount = value),
          error: _errors['amount'],
          hint: isExpense && _paymentMethod == PaymentMethod.card && _installments > 1
              ? '${_installments}x de ${formatCurrency(_amount / _installments)}'
              : null,
        ),
        const SizedBox(height: 16),

        DateField(
          label: meta.dateLabel,
          value: _date,
          onChanged: (value) => setState(() => _date = value ?? _date),
        ),
        const SizedBox(height: 16),

        if (isExpense) ...[
          AppSegmentedControl<PaymentMethod>(
            label: 'Forma de pagamento',
            options: const [
              SegmentedOption(value: PaymentMethod.pix, label: 'Pix', icon: Icons.pix_rounded),
              SegmentedOption(value: PaymentMethod.card, label: 'Cartão', icon: Icons.credit_card_rounded),
            ],
            value: _paymentMethod,
            onChanged: (method) => setState(() => _paymentMethod = method),
          ),
          const SizedBox(height: 16),
          if (_paymentMethod == PaymentMethod.card) ...[
            AppSelect<int>(
              label: 'Parcelas',
              value: _installments,
              options: List.generate(
                24,
                (i) => SelectOption(value: i + 1, label: i == 0 ? 'À vista (1x)' : '${i + 1}x'),
              ),
              onChanged: (value) => setState(() => _installments = value ?? 1),
            ),
            const SizedBox(height: 16),
          ],
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.bgApp.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(AppRadius.input),
              border: Border.all(color: AppColors.border),
            ),
            child: AppCheckbox(
              value: _paid,
              onChanged: (value) => setState(() => _paid = value),
              label: 'Já foi pago',
            ),
          ),
          const SizedBox(height: 16),
        ],

        if (isInvestment) ...[
          AppTextField(
            controller: _cdi,
            label: 'Rendimento (% do CDI)',
            hintText: '110',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            hint: 'Quanto do CDI essa aplicação paga. Usado no simulador.',
            error: _errors['cdi'],
          ),
          const SizedBox(height: 16),
        ],

        if (_kind == FinanceKind.income) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.financeIncomeSoft.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(AppRadius.input),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline_rounded, size: 15, color: AppColors.financeIncome),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Use este formulário para vendas, salários e outras entradas. '
                    'O valor de um cliente entra sozinho nos lucros quando você o marca como concluído.',
                    style: AppText.caption,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        AppTextField(controller: _category, label: 'Categoria', hintText: 'Opcional'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: financeCategories[_kind]!
              .map((suggestion) => ActionChip(
                    label: Text(suggestion, style: AppText.caption),
                    visualDensity: VisualDensity.compact,
                    backgroundColor: AppColors.bgApp,
                    side: const BorderSide(color: AppColors.border),
                    onPressed: () => setState(() => _category.text = suggestion),
                  ))
              .toList(),
        ),
        const SizedBox(height: 16),

        AppTextField(
          controller: _notes,
          label: 'Observações',
          hintText: 'Detalhes adicionais (opcional)',
          maxLines: 2,
        ),
        const SizedBox(height: 24),

        Row(
          children: [
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
                label: widget.entry == null ? 'Salvar' : 'Salvar alterações',
                expand: true,
                isLoading: _submitting,
                onPressed: _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Kicks a sync right after a mutation. The write already landed locally, so
/// nothing waits on this — it just gets the change moving instead of sitting
/// in the queue until the 2-minute timer fires.
void unawaitedSync(WidgetRef ref) {
  ref.read(syncEngineProvider).run();
}
