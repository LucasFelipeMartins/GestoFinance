import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { DeliveryBadge } from './DeliveryBadge';
import { IconButton } from '@/components/ui/IconButton';
import { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onComplete: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientTable({ clients, onEdit, onComplete, onDelete }: ClientTableProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="w-12"></Th>
          <Th>Nome</Th>
          <Th>Número</Th>
          <Th>Serviço</Th>
          <Th>Preço</Th>
          <Th>Entrega</Th>
          <Th>Prioridade</Th>
          <Th>Status</Th>
          <Th className="text-right">Ações</Th>
        </Tr>
      </Thead>
      <Tbody>
        {clients.map((client) => (
          <Tr key={client.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${client.id}`)}>
            <Td>
              <Avatar
                name={client.name}
                initials={client.initials}
                src={client.avatarUrl}
                size="sm"
                showCompletedBadge={client.status === 'completed'}
              />
            </Td>
            <Td className="font-semibold text-text-primary">{client.name}</Td>
            <Td className="whitespace-nowrap">{client.phone}</Td>
            <Td>{client.service}</Td>
            <Td className="whitespace-nowrap">{formatCurrency(client.price)}</Td>
            <Td>
              <DeliveryBadge deliveryDate={client.deliveryDate} status={client.status} />
            </Td>
            <Td>
              <PriorityFlag priority={client.priority} />
            </Td>
            <Td>
              <StatusBadge status={client.status} />
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-1">
                <IconButton icon={<Eye size={16} />} label="Visualizar" onClick={() => navigate(`/clientes/${client.id}`)} />
                <IconButton icon={<Pencil size={16} />} label="Editar" onClick={() => onEdit(client)} />
                <IconButton
                  icon={<CheckCircle size={16} />}
                  label="Marcar como concluído"
                  onClick={() => onComplete(client)}
                  disabled={client.status === 'completed'}
                />
                <IconButton icon={<Trash2 size={16} />} label="Remover" variant="danger" onClick={() => onDelete(client)} />
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
