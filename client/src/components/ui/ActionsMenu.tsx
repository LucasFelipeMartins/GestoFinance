import { ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { POPOVER_CLASS } from './Select';

export interface ActionsMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
  disabled?: boolean;
}

export function ActionsMenu({ items, label = 'Ações' }: { items: ActionsMenuItem[]; label?: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-text-secondary
            transition-colors hover:bg-tint hover:text-brand"
        >
          <MoreVertical size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={`z-40 min-w-[200px] p-1.5 ${POPOVER_CLASS}`}
        >
          {items.map((item, index) => (
            <div key={item.label}>
              {item.separatorBefore && index > 0 && <DropdownMenu.Separator className="my-1 h-px bg-border" />}
              <DropdownMenu.Item
                onSelect={item.onSelect}
                disabled={item.disabled}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-body outline-none
                  data-[highlighted]:bg-tint data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40
                  ${item.danger ? 'text-danger' : 'text-text-primary'}`}
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
