import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover disabled:bg-primary/50',
  secondary:
    'bg-surface text-brand border border-sage-green/40 hover:border-sage-green hover:bg-tint disabled:opacity-50',
  ghost: 'bg-transparent text-brand hover:bg-tint disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger-hover disabled:bg-danger/50',
};

/** Heights match the form fields (44px / 36px) so a button beside an input
 * or a select sits on the same baseline everywhere. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-body-strong',
  sm: 'h-9 px-4 text-body-strong',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, className = '', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold
        transition-colors duration-200 ease-gentle
        active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-sage-green
        disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
