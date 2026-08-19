import { CloudOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useSync } from '@/context/SyncContext';

interface SyncIndicatorProps {
  variant?: 'sidebar' | 'header';
}

export function SyncIndicator({ variant = 'sidebar' }: SyncIndicatorProps) {
  const { isOnline, isSyncing, pendingCount } = useSync();

  let icon = <CheckCircle2 size={15} />;
  let label = 'Sincronizado';

  if (!isOnline) {
    icon = <CloudOff size={15} />;
    label = pendingCount > 0 ? `Offline · ${pendingCount} pendente${pendingCount === 1 ? '' : 's'}` : 'Offline';
  } else if (isSyncing) {
    icon = <RefreshCw size={15} className="animate-spin" />;
    label = 'Sincronizando…';
  } else if (pendingCount > 0) {
    icon = <CloudUpload size={15} />;
    label = `${pendingCount} pendente${pendingCount === 1 ? '' : 's'}`;
  }

  if (variant === 'header') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-badge bg-white px-3 py-1.5 text-caption font-medium text-text-secondary shadow-card">
        {icon}
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-caption font-medium ${
        !isOnline ? 'text-warning' : 'text-white/70'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
