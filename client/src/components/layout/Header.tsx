import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { Avatar } from '@/components/ui/Avatar';
import { SyncIndicator } from './SyncIndicator';

export function Header() {
  const { user } = useAuth();
  const { requestLogout, dialog } = useLogoutConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-bg-app/80 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8 lg:py-6">
      <div className="min-w-0">
        <h1 className="truncate text-h1-mobile text-text-primary lg:text-h1">Olá, {firstName}!</h1>
        <p className="hidden text-body text-text-secondary sm:block">
          Gerencie seus clientes e tarefas de forma simples e eficiente.
        </p>
        <p className="text-caption text-text-secondary sm:hidden">{todayCapitalized}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className="hidden text-body-strong text-text-secondary lg:block">{todayCapitalized}</span>

        <span className="hidden sm:block">
          <SyncIndicator variant="header" />
        </span>

        <button
          type="button"
          onClick={() => toast.info('Nenhuma notificação nova.')}
          aria-label="Notificações"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-secondary shadow-card transition-colors hover:text-evergreen"
        >
          <Bell size={19} />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/70"
              aria-label="Menu do usuário"
            >
              <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="sm" />
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-body-strong text-text-primary">{user?.name}</span>
              </span>
              <ChevronDown size={16} className="hidden text-text-secondary sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-40 min-w-[190px] rounded-input border border-border bg-white p-1.5 shadow-elevated"
            >
              <DropdownMenu.Item
                onSelect={() => navigate('/configuracoes')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-body text-text-primary outline-none data-[highlighted]:bg-bg-app"
              >
                <Settings size={17} />
                Configurações
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={requestLogout}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-body text-danger outline-none data-[highlighted]:bg-danger/10"
              >
                <LogOut size={17} />
                Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {dialog}
    </header>
  );
}
