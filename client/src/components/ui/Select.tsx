import { useId } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

export function Select({ label, error, placeholder = 'Selecionar', options, value, onChange, disabled, name }: SelectProps) {
  const autoId = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={autoId} className="text-body-strong text-text-primary">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          id={autoId}
          aria-invalid={Boolean(error)}
          className={`flex h-11 w-full items-center justify-between rounded-input border bg-white px-4 text-body
            text-text-primary transition-colors duration-200 focus:border-sage-green focus:outline-none
            disabled:bg-bg-app disabled:text-text-secondary disabled:cursor-not-allowed
            ${error ? 'border-danger' : 'border-border hover:border-sage-green/60'}`}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={18} className="text-text-secondary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 overflow-hidden rounded-input border border-border bg-white shadow-elevated w-[var(--radix-select-trigger-width)]"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-body
                    text-text-primary outline-none data-[highlighted]:bg-tea-green/50 data-[state=checked]:font-semibold"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={16} className="text-sage-green" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
