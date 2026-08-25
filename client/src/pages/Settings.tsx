import { LogOut, Mail, User } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { SyncIndicator } from '@/components/layout/SyncIndicator';
import { DownloadAppCard } from '@/components/settings/DownloadAppCard';

export default function Settings() {
  const { user } = useAuth();
  const { requestLogout, dialog } = useLogoutConfirm();

  if (!user) return null;

  return (
    <PageContainer>
      <PageHeader title="Configurações" subtitle="Informações da sua conta." />

      <Card className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-h3 text-text-primary">{user.name}</p>
            <p className="truncate text-body text-text-secondary">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-border border-y border-border">
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
              <User size={17} />
            </span>
            <div>
              <p className="text-caption text-text-secondary">Nome</p>
              <p className="text-body-strong text-text-primary">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
              <Mail size={17} />
            </span>
            <div>
              <p className="text-caption text-text-secondary">E-mail</p>
              <p className="text-body-strong text-text-primary">{user.email}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-caption text-text-secondary">
          Esta conta é individual: apenas você tem acesso aos clientes e tarefas cadastrados aqui.
        </p>

        <div className="mt-6 flex justify-center">
          <SyncIndicator variant="header" />
        </div>

        <Button leftIcon={<LogOut size={18} />} variant="danger" className="mt-4 w-full" onClick={requestLogout}>
          Sair da conta
        </Button>
      </Card>

      <DownloadAppCard />
      {dialog}
    </PageContainer>
  );
}
