import { InputHTMLAttributes, ReactNode, forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from './Input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  leftIcon?: ReactNode;
}

/**
 * A password field with the "olhinho": one tap shows what was typed, another
 * hides it again. Always starts hidden. The toggle is a real button, so it
 * works from the keyboard too, and Enter inside the field still submits.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { leftIcon = <Lock size={18} />, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar senha' : 'Mostrar senha';

  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      leftIcon={leftIcon}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={label}
          title={label}
          aria-pressed={visible}
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-text-secondary transition-colors hover:bg-tint hover:text-brand"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
});
