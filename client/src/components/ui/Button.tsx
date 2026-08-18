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
  primary:
    'bg-evergreen text-white hover:bg-evergreen-hover active:translate-y-0 disabled:bg-evergreen/50',
  secondary:
    'bg-white text-evergreen border border-sage-green/40 hover:bg-tea-green/40 disabled:opacity-50',
  ghost: 'bg-transparent text-evergreen hover:bg-tea-green/40 disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-[#c23131] disabled:bg-danger/50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-body-strong',
  sm: 'h-9 px-4 text-body',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, className = '', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-semibold
        transition-all duration-200 ease-gentle
        hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-sage-green
        disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
