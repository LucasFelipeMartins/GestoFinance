import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'default', className = '', ...props },
  ref
) {
  const variantClass =
    variant === 'danger'
      ? 'text-danger hover:bg-danger/10'
      : 'text-text-secondary hover:bg-tea-green/50 hover:text-evergreen';

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-btn transition-colors duration-200
        disabled:cursor-not-allowed disabled:opacity-40 ${variantClass} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
});
