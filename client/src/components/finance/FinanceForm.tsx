import { useId } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Smartphone, Info } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { FinanceKind, FINANCE_KIND_OPTIONS, FINANCE_CATEGORIES } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { formatCurrency } from '@/utils/formatters';

const schema = z
  .object({
    kind: z.enum(['income', 'expense', 'investment']),
    description: z.string().trim().min(1, 'A descrição é obrigatória.'),
    amount: z.number().positive('Informe um valor maior que zero.'),
    date: z.string().min(1, 'Informe uma data.'),
    category: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    paid: z.boolean().optional(),
    paymentMethod: z.enum(['pix', 'card']).optional(),
    installments: z.number().int().min(1).max(120).optional(),
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

/**
 * One form for all three ledgers. The tipo drives which fields appear:
 * despesas get forma de pagamento (and parcelas on cartão) and investimentos
 * get o percentual do CDI.
 *
 * There is deliberately no "cliente" field on a lucro: a client's receita is
 * produced by concluding the client, so offering it here too would be an open
 * invitation to count the same money twice.
 */
export function FinanceForm({
  defaultValues,
  lockedKind,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Salvar lançamento',
}: FinanceFormProps) {
  const categoryListId = useId();

  const {
    register,
    control,
    handleSubmit,
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
      cdiPercent: 100,
      ...defaultValues,
    },
  });

  const kind = useWatch({ control, name: 'kind' }) ?? lockedKind ?? 'expense';
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const amount = useWatch({ control, name: 'amount' }) ?? 0;
  const installments = useWatch({ control, name: 'installments' }) ?? 1;

  const meta = FINANCE_META[kind];
  const isExpense = kind === 'expense';
  const isInvestment = kind === 'investment';
  const isIncome = kind === 'income';

  const installmentOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i + 1),
    label: i === 0 ? 'À vista (1x)' : `${i + 1}x`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {!lockedKind && (
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <SegmentedControl
              label="Tipo de lançamento"
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

      <div className="flex flex-col gap-4 sm:flex-row">
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <CurrencyInput
              label={isExpense ? 'Valor total' : 'Valor'}
              value={field.value ?? 0}
              onChange={field.onChange}
              error={errors.amount?.message}
              hint={
                isExpense && paymentMethod === 'card' && installments > 1
                  ? `${installments}x de ${formatCurrency(amount / installments)}`
                  : undefined
              }
            />
          )}
        />
        <Input label={meta.dateLabel} type="date" error={errors.date?.message} {...register('date')} />
      </div>

      {isExpense && (
        <>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <SegmentedControl
                label="Forma de pagamento"
                options={[
                  { value: 'pix' as const, label: 'Pix', icon: <Smartphone size={16} /> },
                  { value: 'card' as const, label: 'Cartão', icon: <CreditCard size={16} /> },
                ]}
                value={field.value ?? 'pix'}
                onChange={field.onChange}
              />
            )}
          />
          {errors.paymentMethod?.message && (
            <p className="-mt-2 text-caption text-danger">{errors.paymentMethod.message}</p>
          )}

          {paymentMethod === 'card' && (
            <Controller
              control={control}
              name="installments"
              render={({ field }) => (
                <Select
                  label="Parcelas"
                  options={installmentOptions}
                  value={String(field.value ?? 1)}
                  onChange={(value) => field.onChange(Number(value))}
                  error={errors.installments?.message}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name="paid"
            render={({ field }) => (
              <div className="rounded-input border border-border bg-bg-app/60 px-3">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  label="Já foi pago"
                />
              </div>
            )}
          />
        </>
      )}

      {isInvestment && (
        <Controller
          control={control}
          name="cdiPercent"
          render={({ field }) => (
            <Input
              label="Rendimento (% do CDI)"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="110"
              hint="Quanto do CDI essa aplicação paga. Usado no simulador."
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
        <p className="flex items-start gap-2 rounded-input bg-finance-income-soft/50 px-3 py-2.5 text-caption text-text-secondary">
          <Info size={14} className="mt-0.5 shrink-0 text-finance-income" />
          Use este formulário para vendas, salários e outras entradas. O valor de um
          cliente entra sozinho nos lucros quando você marca o cliente como concluído.
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
