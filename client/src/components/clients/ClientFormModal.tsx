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
    try {
      let clientId = client?._id;

      if (isEditing && client) {
        await updateClient.mutateAsync({ id: client._id, payload: values });
      } else {
        const created = await createClient.mutateAsync(values);
        clientId = created._id;
      }

      if (avatarFile && clientId) {
        await uploadAvatar.mutateAsync({ id: clientId, file: avatarFile });
      }

      toast.success(isEditing ? 'Cliente atualizado com sucesso.' : 'Cliente adicionado com sucesso.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o cliente.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}
      preventOutsideClose={isSubmitting}
    >
      <ClientForm
        key={client?._id ?? 'new'}
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
