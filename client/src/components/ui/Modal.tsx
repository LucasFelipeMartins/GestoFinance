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
  /** Also blocks Escape (while saving, for instance). */
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
        <Dialog.Overlay className="fixed inset-0 z-40 animate-backdrop-in bg-overlay/50 backdrop-blur-[2px]" />
        {/*
         * A tap outside never closes the dialog: on a phone it is far too easy
         * to brush the backdrop while filling in a form and lose everything.
         * The X button (and Escape, when not saving) are the ways out.
         */}
        <Dialog.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => preventOutsideClose && e.preventDefault()}
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] ${maxWidth} -translate-x-1/2 -translate-y-1/2
            max-h-[calc(100dvh-32px)] overflow-y-auto rounded-modal border border-border bg-surface p-5 shadow-elevated animate-modal-in
            sm:max-h-[88vh] sm:p-7`}
        >
          <div className="mb-1 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-h3 text-text-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-body text-text-secondary">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-tint hover:text-text-primary"
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
