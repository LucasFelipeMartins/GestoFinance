import { Modal } from '@/components/ui/Modal';
import { ClientForm, ClientFormValues } from './ClientForm';
import { useCreateClient, useUpdateClient, useUploadClientAvatar } from '@/hooks/useClients';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Client } from '@/types';

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

export function ClientFormModal({ open, onOpenChange, client }: ClientFormModalProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const uploadAvatar = useUploadClientAvatar();
  const toast = useToast();

  const isEditing = Boolean(client);
  const isSubmitting = createClient.isPending || updateClient.isPending || uploadAvatar.isPending;

  const handleSubmit = async (values: ClientFormValues, avatarFile: File | null) => {
    let clientId = client?.id;

    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({ id: client.id, payload: values });
      } else {
        const created = await createClient.mutateAsync(values);
        clientId = created.id;
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o cliente.'));
      return;
    }

    // The client itself is saved locally regardless of connectivity — only
    // the photo needs a live connection, so its failure gets its own
    // message instead of implying the whole save failed.
    if (avatarFile && clientId) {
      try {
        await uploadAvatar.mutateAsync({ id: clientId, file: avatarFile });
      } catch {
        toast.error('Cliente salvo, mas a foto só pode ser enviada com internet. Tente novamente mais tarde.');
        onOpenChange(false);
        return;
      }
    }

    toast.success(isEditing ? 'Cliente atualizado com sucesso.' : 'Cliente adicionado com sucesso.');
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}
      preventOutsideClose={isSubmitting}
    >
      <ClientForm
        key={client?.id ?? 'new'}
        defaultValues={client}
        currentAvatarUrl={client?.avatarUrl}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Salvar Alterações' : 'Salvar Cliente'}
      />
    </Modal>
  );
}
