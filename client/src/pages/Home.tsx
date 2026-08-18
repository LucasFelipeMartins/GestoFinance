import { Users, ListChecks, Clock3, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { RecentClients } from '@/components/dashboard/RecentClients';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { formatPercent } from '@/utils/formatters';

export default function Home() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return (
      <PageContainer>
        <h2 className="text-h2 text-text-primary">Resumo</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  const { clients, tasks, recentClients, recentTasks } = data;
  const combinedCompleted = clients.completed + tasks.completed;
  const combinedTotal = clients.total + tasks.total;
  const combinedRate = combinedTotal === 0 ? 0 : Math.round((combinedCompleted / combinedTotal) * 100);

  return (
    <PageContainer>
      <div>
        <h2 className="text-h2 text-text-primary">Resumo</h2>
        <p className="mt-1 text-body text-text-secondary">Visão geral da operação</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Users size={22} />}
          label="Clientes"
          value={clients.total}
          caption={`${clients.completed} concluídos`}
          percent={clients.completionRate}
        />
        <SummaryCard
          icon={<ListChecks size={22} />}
          label="Tarefas"
          value={tasks.total}
          caption={`${tasks.completed} concluídas`}
          percent={tasks.completionRate}
        />
        <SummaryCard
          icon={<Clock3 size={22} />}
          label="Pendentes"
          value={tasks.pending}
          caption={tasks.overdue > 0 ? `${tasks.overdue} vencida(s)` : 'Nenhuma vencida'}
          attention={tasks.overdue > 0}
        />
        <SummaryCard
          icon={<CheckCircle2 size={22} />}
          label="Concluídas"
          value={combinedCompleted}
          caption={`${formatPercent(combinedRate)} do total`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentClients clients={recentClients} />
        <RecentTasks tasks={recentTasks} />
      </div>
    </PageContainer>
  );
}
