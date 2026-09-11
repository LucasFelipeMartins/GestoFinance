import { useId } from 'react';
import { FIELD_BORDER_CLASS, FIELD_CLASS, FIELD_ERROR_BORDER_CLASS, FieldLabel, FieldMessage } from './Input';

interface CurrencyInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Value in reais (12.34), not cents. */
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  autoFocus?: boolean;
}

function formatFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * BRL amount field.
 *
 * Typing fills from the right in cents (1 → 0,01 → 0,12 → 1,23), which is how
 * every Brazilian banking app behaves and what makes this usable on a phone
 * keypad — a plain `type="number"` would ask for a decimal separator that
 * half of mobile keyboards do not offer.
 */
export function CurrencyInput({
  label,
  error,
  hint,
  value,
  onChange,
  placeholder = '0,00',
  disabled,
  name,
  autoFocus,
}: CurrencyInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const cents = Math.round((Number.isFinite(value) ? value : 0) * 100);
  const display = cents === 0 ? '' : formatFromCents(cents);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    onChange(digits ? Number(digits) / 100 : 0);
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-text-secondary">
          R$
        </span>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={display}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => handleChange(event.target.value)}
          className={`${FIELD_CLASS} pl-11 tabular-nums ${error ? FIELD_ERROR_BORDER_CLASS : FIELD_BORDER_CLASS}`}
        />
      </div>
      <FieldMessage id={errorId} error={error} hint={hint} />
    </div>
  );
}
