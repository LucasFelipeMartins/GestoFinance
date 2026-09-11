import { useId } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { FIELD_BORDER_CLASS, FIELD_ERROR_BORDER_CLASS, FieldLabel, FieldMessage } from './Input';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/** Popover surface shared by Select, ActionsMenu and the header menu. */
export const POPOVER_CLASS = 'rounded-input border border-border bg-surface-2 shadow-elevated';

export function Select({
  label,
  error,
  hint,
  placeholder = 'Selecionar',
  options,
  value,
  onChange,
  disabled,
  name,
  className = '',
}: SelectProps) {
  const autoId = useId();

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`}>
      {label && <FieldLabel htmlFor={autoId}>{label}</FieldLabel>}
      <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          id={autoId}
          aria-invalid={Boolean(error)}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-input border bg-surface px-4 text-left text-body
            text-text-primary transition-colors duration-200 focus:border-sage-green focus:outline-none
            disabled:cursor-not-allowed disabled:bg-bg-app disabled:text-text-secondary
            data-[placeholder]:text-text-secondary/80
            ${error ? FIELD_ERROR_BORDER_CLASS : FIELD_BORDER_CLASS}`}
        >
          <span className="min-w-0 flex-1 truncate">
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon>
            <ChevronDown size={18} className="shrink-0 text-text-secondary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          {/*
           * The list is capped to the room left on screen: without a max
           * height a long list (parcelas, clientes) runs past the bottom of a
           * phone and the hidden options can never be reached. Radix scrolls
           * the viewport once the content is constrained.
           */}
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={`z-50 max-h-[min(340px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[10rem] overflow-hidden ${POPOVER_CLASS}`}
          >
            <RadixSelect.ScrollUpButton className="flex h-7 items-center justify-center bg-surface-2 text-text-secondary">
              <ChevronUp size={16} />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-[40px] cursor-pointer select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-body
                    text-text-primary outline-none data-[highlighted]:bg-tint data-[state=checked]:font-semibold"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={16} className="text-sage-green" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex h-7 items-center justify-center bg-surface-2 text-text-secondary">
              <ChevronDown size={16} />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}
