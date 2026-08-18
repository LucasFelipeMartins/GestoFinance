import { Flag } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Priority } from '@/types';
import { PRIORITY_META } from '@/utils/priority';

export function PriorityFlag({ priority, size = 16 }: { priority: Priority; size?: number }) {
  const meta = PRIORITY_META[priority];

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className="inline-flex items-center justify-center"
            role="img"
            aria-label={meta.accessibleLabel}
          >
            <Flag size={size} fill={meta.color} color={meta.color} strokeWidth={1.5} />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="rounded-md bg-evergreen px-2.5 py-1.5 text-caption text-white shadow-elevated z-50"
          >
            {meta.accessibleLabel}
            <Tooltip.Arrow className="fill-evergreen" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-badge px-3 py-1 text-caption font-medium whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <Flag size={12} fill={meta.color} color={meta.color} strokeWidth={1.5} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
