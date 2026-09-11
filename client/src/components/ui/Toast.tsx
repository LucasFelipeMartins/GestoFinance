import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastItem } from '@/context/ToastContext';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: 'border-sage-green/40',
  error: 'border-danger/40',
  info: 'border-border',
};

const ICON_COLORS = {
  success: 'text-sage-green',
  error: 'text-danger',
  info: 'text-text-secondary',
};

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-[100] flex w-[calc(100%-32px)] max-w-sm flex-col gap-2
        sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-full"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={`flex animate-toast-in items-start gap-3 rounded-card border bg-surface-2 px-4 py-3 text-text-primary shadow-elevated ${STYLES[toast.variant]}`}
          >
            <Icon size={20} className={`mt-0.5 shrink-0 ${ICON_COLORS[toast.variant]}`} aria-hidden="true" />
            <p className="flex-1 text-body">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
              className="shrink-0 text-text-secondary transition hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
