import { useId } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Smartphone, Info, CalendarClock } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { FinanceKind, FINANCE_KIND_OPTIONS, FINANCE_CATEGORIES } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { formatCurrency, formatDate, parseDateInput } from '@/utils/formatters';

const schema = z
  .object({
    kind: z.enum(['income', 'expense', 'investment']),
    description: z.string().trim().min(1, 'Dê um nome para este registro.'),
    amount: z.number().positive('Informe um valor maior que zero.'),
    date: z.string().min(1, 'Informe uma data.'),
    category: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    paid: z.boolean().optional(),
    paymentMethod: z.enum(['pix', 'card']).optional(),
    installments: z.number().int().min(1).max(120).optional(),
    paidInstallments: z.number().int().min(0).max(120).optional(),
    cdiPercent: z.number().min(0).max(1000).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'expense' && !values.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Informe se foi pix ou cartão.',
      });
    }
    if (values.kind === 'expense' && values.paymentMethod === 'card' && !values.installments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installments'],
        message: 'Informe o número de parcelas.',
      });
    }
    if (
      values.kind === 'expense' &&
      values.paymentMethod === 'card' &&
      values.installments &&
      (values.paidInstallments ?? 0) > values.installments
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paidInstallments'],
        message: 'Não pode ser maior que o número de parcelas.',
      });
    }
    // Required rather than optional: it drives the simulator and the portfolio
    // estimate, and leaving it blank would also make the field unclearable on
    // sync (an undefined number can't be expressed in the update payload).
    if (values.kind === 'investment' && values.cdiPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cdiPercent'],
        message: 'Informe quanto do CDI a aplicação rende.',
      });
    }
  });

export type FinanceFormValues = z.infer<typeof schema>;

interface FinanceFormProps {
  defaultValues?: Partial<FinanceFormValues>;
  /** When set, the tipo picker is hidden — the page already decided it. */
  lockedKind?: FinanceKind;
  onSubmit: (values: FinanceFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const INSTALLMENT_PICKS = [
  { value: 1, label: 'À vista' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 6, label: '6x' },
  { value: 10, label: '10x' },
  { value: 12, label: '12x' },
];

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

/**
 * One form for all three ledgers. The tipo drives which fields appear:
 * despesas get forma de pagamento (and parcelas on cartão) and investimentos
 * get o percentual do CDI.
 *
 * There is deliberately no "cliente" field on a receita: a client's receita
 * is produced by concluding the client, so offering it here too would be an
 * open invitation to count the same money twice.
 */
export function FinanceForm({
  defaultValues,
  lockedKind,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Salvar',
}: FinanceFormProps) {
  const categoryListId = useId();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FinanceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: lockedKind ?? 'expense',
      description: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      category: '',
      notes: '',
      paid: false,
      paymentMethod: 'pix',
      installments: 1,
      paidInstallments: 0,
      cdiPercent: 100,
      ...defaultValues,
    },
  });

  const kind = useWatch({ control, name: 'kind' }) ?? lockedKind ?? 'expense';
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const amount = useWatch({ control, name: 'amount' }) ?? 0;
  const installments = useWatch({ control, name: 'installments' }) ?? 1;
  const paidInstallments = useWatch({ control, name: 'paidInstallments' }) ?? 0;
  const dateValue = useWatch({ control, name: 'date' });

  const meta = FINANCE_META[kind];
  const isExpense = kind === 'expense';
  const isInvestment = kind === 'investment';
  const isIncome = kind === 'income';
  const isCard = isExpense && paymentMethod === 'card';
  const hasPlan = isCard && installments > 1;

  const installmentAmount = installments > 0 ? amount / installments : amount;
  const openInstallments = Math.max(0, installments - paidInstallments);
  const purchaseDate = parseDateInput(dateValue ?? '');
  const nextDue = purchaseDate && openInstallments > 0 ? addMonths(purchaseDate, paidInstallments) : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {!lockedKind && (
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <SegmentedControl
              label="O que é?"
              options={FINANCE_KIND_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              activeColor={meta.color}
              activeBackground={meta.soft}
            />
          )}
        />
      )}

      <Input
        label="Descrição"
        placeholder={
          isExpense ? 'Ex: Conta de luz' : isInvestment ? 'Ex: CDB Banco X' : 'Ex: Site institucional'
        }
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <CurrencyInput
              label={isExpense ? 'Valor total' : 'Valor'}
              value={field.value ?? 0}
              onChange={field.onChange}
              error={errors.amount?.message}
              hint={hasPlan ? `${installments}x de ${formatCurrency(installmentAmount)}` : undefined}
            />
          )}
        />
        <Input
          label={isCard && installments > 1 ? 'Data da compra' : meta.dateLabel}
          type="date"
          error={errors.date?.message}
          hint={hasPlan ? 'A 1ª parcela vence nesta data.' : undefined}
          {...register('date')}
        />
      </div>

      {isExpense && (
        <>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <SegmentedControl
                label="Como foi pago?"
                options={[
                  { value: 'pix' as const, label: 'Pix / dinheiro', icon: <Smartphone size={16} /> },
                  { value: 'card' as const, label: 'Cartão', icon: <CreditCard size={16} /> },
                ]}
                value={field.value ?? 'pix'}
                onChange={(value) => {
                  field.onChange(value);
                  if (value !== 'card') {
                    setValue('installments', 1);
                    setValue('paidInstallments', 0);
                  }
                }}
              />
            )}
          />
          {errors.paymentMethod?.message && (
            <p className="-mt-2 text-caption text-danger">{errors.paymentMethod.message}</p>
          )}

          {isCard && (
            <Controller
              control={control}
              name="installments"
              render={({ field }) => (
                <NumberStepper
                  label="Em quantas parcelas?"
                  value={field.value ?? 1}
                  min={1}
                  max={120}
                  suffix="x"
                  quickPicks={INSTALLMENT_PICKS}
                  onChange={(value) => {
                    field.onChange(value);
                    // Paid can't exceed the new total.
                    if (paidInstallments > value) setValue('paidInstallments', value);
                    if (value <= 1) setValue('paidInstallments', 0);
                  }}
                  error={errors.installments?.message}
                />
              )}
            />
          )}

          {hasPlan ? (
            <Controller
              control={control}
              name="paidInstallments"
              render={({ field }) => (
                <NumberStepper
                  label="Parcelas já pagas"
                  value={field.value ?? 0}
                  min={0}
                  max={installments}
                  onChange={(value) => {
                    field.onChange(value);
                    setValue('paid', value >= installments);
                  }}
                  error={errors.paidInstallments?.message}
                  hint={
                    openInstallments === 0
                      ? 'Todas as parcelas estão pagas.'
                      : `Faltam ${openInstallments} parcela${openInstallments === 1 ? '' : 's'} de ${formatCurrency(
                          installmentAmount
                        )}${nextDue ? ` · a próxima vence em ${formatDate(nextDue)}` : ''}`
                  }
                />
              )}
            />
          ) : (
            <Controller
              control={control}
              name="paid"
              render={({ field }) => (
                <div className="flex h-11 items-center rounded-input border border-border bg-bg-app/60 px-2">
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setValue('paidInstallments', checked ? Math.max(1, installments) : 0);
                    }}
                    label="Já foi pago"
                  />
                </div>
              )}
            />
          )}

          {hasPlan && openInstallments > 0 && (
            <p className="flex items-start gap-2 rounded-input bg-finance-expense-soft/60 px-3 py-2.5 text-caption text-text-secondary">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-finance-expense" />
              Nas contas a pagar aparece só a próxima parcela. Marque cada uma como paga quando pagar a
              fatura do mês.
            </p>
          )}
        </>
      )}

      {isInvestment && (
        <Controller
          control={control}
          name="cdiPercent"
          render={({ field }) => (
            <Input
              label="Quanto rende (% do CDI)"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="110"
              hint="O CDI é a taxa de referência dos bancos. Ex.: 110 = rende 110% do CDI. Está no contrato ou no app do banco."
              error={errors.cdiPercent?.message}
              value={field.value ?? ''}
              onChange={(event) =>
                field.onChange(event.target.value === '' ? undefined : Number(event.target.value))
              }
            />
          )}
        />
      )}

      {isIncome && (
        <p className="flex items-start gap-2 rounded-input bg-finance-income-soft/60 px-3 py-2.5 text-caption text-text-secondary">
          <Info size={14} className="mt-0.5 shrink-0 text-finance-income" />
          Use este formulário para vendas, salários e outras entradas. O valor de um cliente entra
          sozinho nas receitas quando você marca o cliente como concluído.
        </p>
      )}

      <div>
        <Input
          label="Categoria"
          placeholder="Opcional"
          list={categoryListId}
          error={errors.category?.message}
          {...register('category')}
        />
        <datalist id={categoryListId}>
          {FINANCE_CATEGORIES[kind].map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <Textarea
        label="Observações"
        placeholder="Detalhes adicionais (opcional)"
        rows={2}
        error={errors.notes?.message}
        {...register('notes')}
      />

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
