import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FIELD_BORDER_CLASS, FIELD_ERROR_BORDER_CLASS, FieldLabel, FieldMessage } from './Input';

interface QuickPick {
  value: number;
  label: string;
}

interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** One-tap presets shown under the field (À vista, 3x, 12x…). */
  quickPicks?: QuickPick[];
  /** Read out and rendered after the number: "4" → "4x". */
  suffix?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * An integer field with −/+ buttons and optional presets.
 *
 * Replaces the dropdown for parcelas: a 24-item popover on a phone either
 * runs off the screen or fights the modal for scroll, and a tap lands on the
 * wrong row far too often. Two big buttons and a numeric keypad can't miss.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 120,
  error,
  hint,
  disabled,
  quickPicks,
  suffix,
}: NumberStepperProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const set = (next: number) => onChange(clamp(Math.round(next), min, max));

  const buttonClass =
    'flex h-full w-12 shrink-0 items-center justify-center text-text-secondary transition-colors ' +
    'hover:bg-tint hover:text-brand disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div
        className={`flex h-11 w-full items-stretch overflow-hidden rounded-input border bg-surface transition-colors
          focus-within:border-sage-green ${error ? FIELD_ERROR_BORDER_CLASS : FIELD_BORDER_CLASS}
          ${disabled ? 'bg-bg-app' : ''}`}
      >
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={disabled || value <= min}
          aria-label="Diminuir"
          className={`${buttonClass} border-r border-border`}
        >
          <Minus size={17} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(value)}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              if (digits === '') {
                onChange(min);
                return;
              }
              set(Number(digits));
            }}
            onFocus={(event) => event.target.select()}
            className={`h-full bg-transparent text-[16px] font-semibold tabular-nums text-text-primary outline-none disabled:cursor-not-allowed sm:text-body-strong ${
              suffix ? 'w-[3.5ch] text-right' : 'w-full text-center'
            }`}
          />
          {suffix && (
            <span aria-hidden="true" className="text-body-strong text-text-primary">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => set(value + 1)}
          disabled={disabled || value >= max}
          aria-label="Aumentar"
          className={`${buttonClass} border-l border-border`}
        >
          <Plus size={17} />
        </button>
      </div>

      {quickPicks && quickPicks.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5" role="group" aria-label="Atalhos">
          {quickPicks.map((pick) => {
            const selected = pick.value === value;
            return (
              <button
                key={pick.value}
                type="button"
                disabled={disabled}
                onClick={() => set(pick.value)}
                aria-pressed={selected}
                className={`h-8 rounded-badge border px-3 text-caption font-semibold transition-colors
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${
                    selected
                      ? 'border-sage-green bg-tint text-brand'
                      : 'border-border bg-surface text-text-secondary hover:border-sage-green/60 hover:text-text-primary'
                  }`}
              >
                {pick.label}
              </button>
            );
          })}
        </div>
      )}

      <FieldMessage id={errorId} error={error} hint={hint} />
    </div>
  );
}
