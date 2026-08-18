import { LogOut, Mail, User } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <PageContainer>
      <div>
        <h2 className="text-h2 text-text-primary">Configurações</h2>
        <p className="mt-1 text-body text-text-secondary">Informações da sua conta.</p>
      </div>

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

        <Button leftIcon={<LogOut size={18} />} variant="danger" className="mt-6 w-full" onClick={() => logout()}>
          Sair da conta
        </Button>
      </Card>
    </PageContainer>
  );
}
