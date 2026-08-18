import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastItem } from '@/context/ToastContext';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: 'border-sage-green/30 bg-white text-text-primary',
  error: 'border-danger/30 bg-white text-text-primary',
  info: 'border-border bg-white text-text-primary',
};

const ICON_COLORS = {
  success: 'text-sage-green',
  error: 'text-danger',
  info: 'text-muted-olive',
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
      className="fixed z-[100] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm
        bottom-20 left-4 right-4
        sm:bottom-auto sm:left-auto sm:top-4 sm:right-4 sm:w-full"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-3 rounded-card border px-4 py-3 shadow-elevated animate-toast-in ${STYLES[toast.variant]}`}
          >
            <Icon size={20} className={`mt-0.5 shrink-0 ${ICON_COLORS[toast.variant]}`} aria-hidden="true" />
            <p className="text-body flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
              className="shrink-0 text-text-secondary hover:text-text-primary transition"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
