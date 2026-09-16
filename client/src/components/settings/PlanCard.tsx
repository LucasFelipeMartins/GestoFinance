import { Link } from 'react-router-dom';
import { CreditCard, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { describePlan, formatPlanPrice } from '@/utils/plan';

/** A glance at the plan from Configurações, with the way to the full page. */
export function PlanCard() {
  const { user } = useAuth();
  const access = user?.access;
  if (!access) return null;

  const plan = describePlan(access);
  const tone = { neutral: 'success', warning: 'warning', danger: 'danger' } as const;

  return (
    <Card className="mx-auto w-full max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-sage-green">
            <CreditCard size={20} />
          </span>
          <div>
            <h3 className="text-h3 text-text-primary">Assinatura</h3>
            <p className="text-caption text-text-secondary">{plan.title}</p>
          </div>
        </div>
        <Badge tone={tone[plan.tone]}>{access.allowed ? 'Ativo' : 'Vencido'}</Badge>
      </div>

      <p className="mt-4 text-body text-text-secondary">{plan.detail}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-caption text-text-secondary">Plano: {formatPlanPrice(access)}</span>
        <Link to="/assinatura">
          <Button
            variant={plan.canPay ? 'primary' : 'secondary'}
            size="sm"
            rightIcon={<ArrowRight size={15} />}
          >
            {access.subscription?.status === 'authorized'
              ? 'Gerenciar assinatura'
              : plan.canPay
                ? access.reason === 'paid'
                  ? 'Renovar'
                  : 'Ver plano e pagar'
                : 'Ver plano'}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
