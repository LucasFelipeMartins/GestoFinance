import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function useLogoutConfirm() {
  const { logout } = useAuth();
  const { pendingCount } = useSync();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const doLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const requestLogout = () => {
    if (pendingCount > 0) {
      setOpen(true);
    } else {
      doLogout();
    }
  };

  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Sair mesmo assim?"
      description={`Você tem ${pendingCount} ${
        pendingCount === 1 ? 'alteração' : 'alterações'
      } ainda não sincronizada${pendingCount === 1 ? '' : 's'}. Elas serão perdidas se sair agora.`}
      confirmLabel="Sair e perder alterações"
      cancelLabel="Cancelar"
      onConfirm={doLogout}
      isLoading={isLoading}
    />
  );

  return { requestLogout, dialog };
}
