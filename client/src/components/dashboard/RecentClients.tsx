import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { DeliveryBadge } from '@/components/clients/DeliveryBadge';
import { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';

export function RecentClients({ clients }: { clients: Client[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-h3 text-text-primary">
          <Users size={19} className="text-sage-green" />
          Clientes Recentes
        </h3>
        <button
          type="button"
          onClick={() => navigate('/clientes')}
          className="inline-flex items-center gap-1 text-body-strong text-sage-green hover:underline"
        >
          Ver todos
          <ArrowRight size={15} />
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="mt-6 text-body text-text-secondary">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {clients.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${client.id}`)}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-bg-app/60 rounded-md px-1 -mx-1"
              >
                <Avatar
                  name={client.name}
                  initials={client.initials}
                  src={client.avatarUrl}
                  showCompletedBadge={client.status === 'completed'}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-strong text-text-primary">{client.name}</p>
                  <p className="truncate text-caption text-text-secondary">{client.service}</p>
                  {client.deliveryDate && (
                    <span className="mt-1 inline-flex">
                      <DeliveryBadge deliveryDate={client.deliveryDate} status={client.status} />
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-body-strong text-text-primary">{formatCurrency(client.price)}</span>
                  <StatusBadge status={client.status} />
                </div>
                <PriorityFlag priority={client.priority} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
