import { Link } from 'react-router-dom';
import { Users, ListChecks, Clock3, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PercentRing } from '@/components/ui/PercentRing';
import { DashboardSummary } from '@/types';

interface OperationSummaryProps {
  clients: DashboardSummary['clients'];
  tasks: DashboardSummary['tasks'];
}

/**
 * Clientes e tarefas condensed into a single card.
 *
 * The financial tiles above already own the top of Home; giving the
 * operational numbers four more full cards would double the tile count for
 * no extra information. One card, four figures.
 */
export function OperationSummary({ clients, tasks }: OperationSummaryProps) {
  const items = [
    {
      icon: <Users size={17} />,
      label: 'Clientes',
      value: clients.total,
      caption: `${clients.completed} concluídos`,
      to: '/clientes',
    },
    {
      icon: <ListChecks size={17} />,
      label: 'Tarefas',
      value: tasks.total,
      caption: `${tasks.completed} concluídas`,
      to: '/tarefas',
    },
    {
      icon: <Clock3 size={17} />,
      label: 'Pendentes',
      value: tasks.pending + tasks.inProgress,
      caption: `${tasks.inProgress} em andamento`,
      to: '/tarefas',
    },
    {
      icon: <AlertTriangle size={17} />,
      label: 'Vencidas',
      value: tasks.overdue,
      caption: tasks.overdue > 0 ? 'Precisam de atenção' : 'Tudo em dia',
      to: '/tarefas',
      attention: tasks.overdue > 0,
    },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h3 text-text-primary">Operação</h3>
        <Link
          to="/tarefas"
          className="inline-flex items-center gap-1 text-body-strong text-sage-green hover:underline"
        >
          Ver tarefas
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group rounded-input px-1 py-1 transition-colors hover:bg-bg-app"
            >
              <span className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary">
                <span className="text-sage-green" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </span>
              <p className="mt-1 text-h2 tabular-nums text-text-primary">{item.value}</p>
              <p
                className={`text-caption ${
                  item.attention ? 'font-semibold text-danger' : 'text-text-secondary'
                }`}
              >
                {item.caption}
              </p>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <PercentRing value={tasks.completionRate} />
          <div>
            <p className="text-body-strong text-text-primary">Conclusão</p>
            <p className="text-caption text-text-secondary">das tarefas</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
