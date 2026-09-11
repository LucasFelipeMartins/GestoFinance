import { ReactNode } from 'react';
import { Handshake } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Line under the card (the "ainda não tem conta?" link). */
  footer?: ReactNode;
}

/**
 * The frame every signed-out page shares (entrar, criar conta, esqueci a
 * senha, redefinir senha): same logo, same card, same widths, so moving
 * between them never feels like changing sites.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-bg-app px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-evergreen">
            <Handshake size={28} className="text-tea-green" />
          </span>
          <div>
            <h1 className="text-h1-mobile text-text-primary">GestorPro</h1>
            <p className="text-body text-text-secondary">Clientes, tarefas e finanças</p>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
          <h2 className="text-h2 text-text-primary">{title}</h2>
          {description && <p className="mt-1 text-body text-text-secondary">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-body text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}

/** Inline server error shown inside the auth cards. */
export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-input bg-danger/10 px-4 py-3 text-body text-danger">
      {message}
    </p>
  );
}
