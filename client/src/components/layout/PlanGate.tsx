import { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Clock3, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Pages the person may still reach after the plan ran out. */
const OPEN_ROUTES = ['/assinatura', '/configuracoes'];

/**
 * Sends an expired account to the plan page and, in the last days of a
 * trial or paid period, shows a reminder strip above every page so the
 * renewal never comes as a surprise.
 */
export function PlanGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const access = user?.access;

  if (access && !access.allowed && !OPEN_ROUTES.some((route) => location.pathname.startsWith(route))) {
    return <Navigate to="/assinatura" replace />;
  }

  const remind =
    access?.allowed &&
    (access.reason === 'trial' || access.reason === 'paid') &&
    access.daysLeft <= 3 &&
    !location.pathname.startsWith('/assinatura');

  return (
    <>
      {remind && (
        <div className="border-b border-warning/40 bg-warning/20 px-4 py-2.5 text-caption text-warning-fg sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1">
            <Clock3 size={15} className="shrink-0" />
            <span className="font-semibold">
              {access.reason === 'trial' ? 'Seu teste grátis' : 'Sua assinatura'} termina em{' '}
              {access.daysLeft <= 0 ? 'menos de um dia' : `${access.daysLeft} dia${access.daysLeft === 1 ? '' : 's'}`}.
            </span>
            <Link to="/assinatura" className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
              {access.reason === 'trial' ? 'Assinar agora' : 'Renovar'}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
