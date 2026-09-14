import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, forwardRef, useId } from 'react';

/** The one field shell every text-like control shares (Input, CurrencyInput,
 * SearchInput, Select trigger) so they all line up at the same height and
 * radius wherever they sit side by side. */
export const FIELD_CLASS =
  'h-11 w-full rounded-input border bg-surface px-4 text-[16px] text-text-primary sm:text-body ' +
  'placeholder:text-text-secondary/70 transition-colors duration-200 ' +
  'focus:border-sage-green focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-bg-app disabled:text-text-secondary';

export const FIELD_BORDER_CLASS = 'border-border hover:border-sage-green/60';
export const FIELD_ERROR_BORDER_CLASS = 'border-danger';

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-body-strong text-text-primary">
      {children}
    </label>
  );
}

export function FieldMessage({ id, error, hint }: { id?: string; error?: string; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} className="text-caption text-danger">
        {error}
      </p>
    );
  }
  if (hint) return <p className="text-caption text-text-secondary">{hint}</p>;
  return null;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  leftIcon?: ReactNode;
  /** Interactive element pinned to the right edge (a show/hide toggle, a unit). */
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className = '', id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${FIELD_CLASS}
            ${leftIcon ? 'pl-10' : ''}
            ${rightSlot ? 'pr-12' : ''}
            ${error ? FIELD_ERROR_BORDER_CLASS : FIELD_BORDER_CLASS}
            ${className}`}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">{rightSlot}</span>
        )}
      </div>
      <FieldMessage id={errorId} error={error} hint={hint} />
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className = '', id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-[96px] w-full resize-none rounded-input border bg-surface px-4 py-3 text-[16px] text-text-primary sm:text-body
          placeholder:text-text-secondary/70 transition-colors duration-200
          focus:border-sage-green focus:outline-none
          disabled:cursor-not-allowed disabled:bg-bg-app disabled:text-text-secondary
          ${error ? FIELD_ERROR_BORDER_CLASS : FIELD_BORDER_CLASS}
          ${className}`}
        {...props}
      />
      <FieldMessage id={errorId} error={error} hint={hint} />
    </div>
  );
});
