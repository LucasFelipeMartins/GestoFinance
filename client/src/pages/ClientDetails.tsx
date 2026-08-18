import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Briefcase, DollarSign, Calendar, Clock, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { useClient, useUpdateClientStatus } from '@/hooks/useClients';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="truncate text-body-strong text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const updateStatus = useUpdateClientStatus();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleComplete = async () => {
    if (!client) return;
    try {
      await updateStatus.mutateAsync({ id: client._id, status: 'completed' });
      toast.success('Cliente concluído.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-9 w-40" />
        <Card className="flex flex-col items-center gap-3 py-10">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </Card>
      </PageContainer>
    );
  }

  if (!client) {
    return (
      <PageContainer>
        <p className="text-body text-text-secondary">Cliente não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate('/clientes')}
        className="inline-flex w-fit items-center gap-1.5 text-body-strong text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      <Card className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar
            name={client.name}
            initials={client.initials}
            src={client.avatarUrl}
            size="xl"
            showCompletedBadge={client.status === 'completed'}
          />
          <div>
            <h1 className="text-h2 text-text-primary">{client.name}</h1>
            <p className="text-body text-text-secondary">{client.service}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={client.status} />
            <PriorityFlag priority={client.priority} />
          </div>
        </div>

        <div className="mt-6 divide-y divide-border border-y border-border">
          <DetailRow icon={<Phone size={17} />} label="Número" value={client.phone} />
          <DetailRow icon={<Briefcase size={17} />} label="Serviço" value={client.service} />
          <DetailRow icon={<DollarSign size={17} />} label="Preço" value={formatCurrency(client.price)} />
          <DetailRow icon={<Calendar size={17} />} label="Adicionado em" value={formatDate(client.createdAt)} />
          <DetailRow icon={<Clock size={17} />} label="Última atualização" value={formatDate(client.updatedAt)} />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button leftIcon={<Pencil size={18} />} variant="secondary" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <Button
            leftIcon={<CheckCircle size={18} />}
            variant="secondary"
            onClick={handleComplete}
            disabled={client.status === 'completed'}
            isLoading={updateStatus.isPending}
          >
            Marcar como concluído
          </Button>
          <Button leftIcon={<Trash2 size={18} />} variant="danger" onClick={() => setDeleteOpen(true)}>
            Remover
          </Button>
        </div>
      </Card>

      <ClientFormModal open={editOpen} onOpenChange={setEditOpen} client={client} />
      <DeleteClientDialog
        client={deleteOpen ? client : null}
        onOpenChange={(open) => setDeleteOpen(open)}
        onDeleted={() => navigate('/clientes')}
      />
    </PageContainer>
  );
}
