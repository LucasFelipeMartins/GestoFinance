import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OperationSummary } from '@/components/dashboard/OperationSummary';
import { RecentClients } from '@/components/dashboard/RecentClients';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { FinanceKpis } from '@/components/finance/FinanceKpis';
import { FinanceChart } from '@/components/finance/FinanceChart';
import { BillsPanel } from '@/components/finance/BillsPanel';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useFinanceOverview } from '@/hooks/useFinance';

/** How many months the Home chart looks back. */
const CHART_MONTHS = 5;

export default function Home() {
  const { data, isLoading } = useDashboardSummary();
  const { overview, isLoading: isLoadingFinance } = useFinanceOverview(CHART_MONTHS);

  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const currentMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  if (isLoading || isLoadingFinance || !data) {
    return (
      <PageContainer>
        <PageHeader title="Resumo" subtitle="Visão geral da operação e das finanças" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  const { clients, tasks, recentClients, recentTasks } = data;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={currentMonth}
        title="Resumo"
        subtitle="Visão geral da operação e das finanças"
      />

      <FinanceKpis totals={overview.totals} periodLabel={currentMonth} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <FinanceChart series={overview.series} />
        </Card>
        <BillsPanel bills={overview.openBills} summary={overview.bills} />
      </div>

      <OperationSummary clients={clients} tasks={tasks} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentClients clients={recentClients} />
        <RecentTasks tasks={recentTasks} />
      </div>
    </PageContainer>
  );
}
