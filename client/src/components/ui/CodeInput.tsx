import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';
import { FieldMessage } from './Input';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Called once every box is filled — lets the form submit without a tap. */
  onComplete?: (code: string) => void;
}

/**
 * The six boxes for the e-mailed confirmation code.
 *
 * One box per digit rather than a single input: it reads as "type the code
 * you got", pasting the whole code fills every box at once, and the numeric
 * keypad comes up on phones. Backspace walks back a box.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  autoFocus,
  onComplete,
}: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleInput = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // Typing (or autofill) can deliver several digits into one box.
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(0, length);
    commit(next);
    refs.current[Math.min(length - 1, index + typed.length)]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index));
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    commit(pasted);
    refs.current[Math.min(length - 1, pasted.replace(/\D/g, '').length)]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-2" role="group" aria-label="Código de confirmação">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Dígito ${index + 1} de ${length}`}
            aria-invalid={Boolean(error)}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            className={`h-14 w-full min-w-0 rounded-input border bg-surface text-center text-h2 tabular-nums text-text-primary
              transition-colors focus:border-sage-green focus:outline-none
              disabled:cursor-not-allowed disabled:bg-bg-app
              ${error ? 'border-danger' : 'border-border'}`}
          />
        ))}
      </div>
      <FieldMessage error={error} />
    </div>
  );
}
