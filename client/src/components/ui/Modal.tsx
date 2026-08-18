import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  preventOutsideClose?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  preventOutsideClose,
}: ModalProps) {
  const maxWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-evergreen/40 backdrop-blur-[2px] animate-backdrop-in" />
        <Dialog.Content
          onPointerDownOutside={(e) => preventOutsideClose && e.preventDefault()}
          onEscapeKeyDown={(e) => preventOutsideClose && e.preventDefault()}
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] ${maxWidth} -translate-x-1/2 -translate-y-1/2
            max-h-[85vh] overflow-y-auto rounded-modal bg-white p-6 shadow-elevated animate-modal-in
            sm:p-8`}
        >
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <Dialog.Title className="text-h3 text-text-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-body text-text-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="shrink-0 rounded-full p-1.5 text-text-secondary hover:bg-bg-app hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
          {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
