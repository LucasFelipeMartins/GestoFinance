import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { DeliveryBadge } from './DeliveryBadge';
import { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface ClientCardMobileProps {
  client: Client;
  onEdit: (client: Client) => void;
  onComplete: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientCardMobile({ client, onEdit, onComplete, onDelete }: ClientCardMobileProps) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col gap-3 cursor-pointer" onClick={() => navigate(`/clientes/${client.id}`)}>
      <div className="flex items-start gap-3">
        <Avatar
          name={client.name}
          initials={client.initials}
          src={client.avatarUrl}
          showCompletedBadge={client.status === 'completed'}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-strong text-text-primary">{client.name}</p>
          <p className="truncate text-caption text-text-secondary">{client.service}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ActionsMenu
            items={[
              { label: 'Visualizar', icon: <Eye size={16} />, onSelect: () => navigate(`/clientes/${client.id}`) },
              { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => onEdit(client) },
              { label: 'Marcar como concluído', icon: <CheckCircle size={16} />, onSelect: () => onComplete(client) },
              { label: 'Remover', icon: <Trash2 size={16} />, onSelect: () => onDelete(client), danger: true, separatorBefore: true },
            ]}
          />
        </div>
      </div>

      <p className="text-body text-text-secondary">{client.phone}</p>
      <p className="text-body-strong text-text-primary">{formatCurrency(client.price)}</p>

      {client.deliveryDate && (
        <DeliveryBadge deliveryDate={client.deliveryDate} status={client.status} showDate />
      )}

      <div className="flex items-center justify-between">
        <StatusBadge status={client.status} />
        <PriorityFlag priority={client.priority} />
      </div>
    </Card>
  );
}
