import { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Accent for the selected segment. Defaults to the app's brand green. */
  activeColor?: string;
  activeBackground?: string;
}

/**
 * A two-to-four way choice shown all at once. Preferred over a Select where
 * the options are few and the choice drives the rest of a form (tipo de
 * registro, forma de pagamento) — one tap instead of open-scan-tap.
 *
 * 44px tall like every other field, so it lines up beside inputs.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  activeColor,
  activeBackground,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <span className="text-body-strong text-text-primary">{label}</span>}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex h-11 w-full gap-1 rounded-input border border-border bg-bg-app p-1"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              style={
                selected && activeColor
                  ? { color: activeColor, backgroundColor: activeBackground ?? 'rgb(var(--c-surface))' }
                  : undefined
              }
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 text-body-strong
                transition-all duration-200 ease-gentle
                disabled:cursor-not-allowed disabled:opacity-50
                ${
                  selected
                    ? `shadow-card ${activeColor ? '' : 'bg-surface text-brand'}`
                    : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              {option.icon}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
