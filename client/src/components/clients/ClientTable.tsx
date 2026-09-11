import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { DeliveryBadge } from './DeliveryBadge';
import { IconButton } from '@/components/ui/IconButton';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onComplete: (client: Client) => void;
  onDelete: (client: Client) => void;
}

/**
 * Desktop list. Name, phone and priority share one cell and the rarer
 * actions live in a menu, so the whole row fits a 1024px laptop with the
 * sidebar open — no horizontal scroll hiding the buttons.
 */
export function ClientTable({ clients, onEdit, onComplete, onDelete }: ClientTableProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Cliente</Th>
          <Th>Serviço</Th>
          <Th className="text-right">Preço</Th>
          <Th>Entrega</Th>
          <Th>Situação</Th>
          <Th className="w-[120px] text-right">Ações</Th>
        </Tr>
      </Thead>
      <Tbody>
        {clients.map((client) => (
          <Tr key={client.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${client.id}`)}>
            <Td>
              <div className="flex items-center gap-3">
                <Avatar
                  name={client.name}
                  initials={client.initials}
                  src={client.avatarUrl}
                  size="sm"
                  showCompletedBadge={client.status === 'completed'}
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 whitespace-nowrap text-body-strong text-text-primary">
                    <span className="max-w-[220px] truncate">{client.name}</span>
                    <PriorityFlag priority={client.priority} size={14} />
                  </p>
                  <p className="whitespace-nowrap text-caption text-text-secondary">{client.phone}</p>
                </div>
              </div>
            </Td>
            <Td>
              <span className="line-clamp-2 max-w-[260px]">{client.service}</span>
            </Td>
            <Td className="whitespace-nowrap text-right tabular-nums">{formatCurrency(client.price)}</Td>
            <Td>
              <DeliveryBadge deliveryDate={client.deliveryDate} status={client.status} />
            </Td>
            <Td>
              <StatusBadge status={client.status} />
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-0.5">
                <IconButton icon={<Pencil size={16} />} label="Editar" onClick={() => onEdit(client)} />
                <IconButton
                  icon={<CheckCircle size={16} />}
                  label="Marcar como concluído"
                  onClick={() => onComplete(client)}
                  disabled={client.status === 'completed'}
                />
                <ActionsMenu
                  items={[
                    { label: 'Ver detalhes', icon: <Eye size={16} />, onSelect: () => navigate(`/clientes/${client.id}`) },
                    {
                      label: 'Remover',
                      icon: <Trash2 size={16} />,
                      onSelect: () => onDelete(client),
                      danger: true,
                      separatorBefore: true,
                    },
                  ]}
                />
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
