import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
}

export function Checkbox({ checked, onCheckedChange, label, hideLabel, size = 'md' }: CheckboxProps) {
  const boxSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px] min-w-[44px] justify-center">
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={label}
        className={`flex ${boxSize} items-center justify-center rounded-md border-2 border-border bg-white
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
