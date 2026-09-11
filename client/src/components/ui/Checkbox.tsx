import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, label, hideLabel, size = 'md', disabled }: CheckboxProps) {
  const boxSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <label
      className={`inline-flex min-h-[44px] min-w-[44px] select-none items-center justify-center gap-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <RadixCheckbox.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={label}
        className={`flex ${boxSize} shrink-0 items-center justify-center rounded-md border-2 border-border bg-surface
          transition-all duration-200 ease-gentle
          data-[state=checked]:animate-check-pop data-[state=checked]:border-sage-green data-[state=checked]:bg-sage-green
          focus-visible:outline-2 focus-visible:outline-sage-green focus-visible:outline-offset-2`}
      >
        <RadixCheckbox.Indicator>
          <Check size={size === 'sm' ? 13 : 15} className="text-white" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {!hideLabel && <span className="text-body text-text-primary">{label}</span>}
    </label>
  );
}
