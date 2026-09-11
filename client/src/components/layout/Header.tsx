import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { Avatar } from '@/components/ui/Avatar';
import { POPOVER_CLASS } from '@/components/ui/Select';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { user } = useAuth();
  const { requestLogout, dialog } = useLogoutConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-bg-app/85 px-4 py-3 backdrop-blur-sm sm:gap-4 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
      <div className="min-w-0">
        <h1 className="truncate text-h1-mobile text-text-primary lg:text-h1">Olá, {firstName}!</h1>
        <p className="hidden text-body text-text-secondary sm:block">Clientes, tarefas e finanças em um só lugar.</p>
        <p className="text-caption text-text-secondary sm:hidden">{todayCapitalized}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden text-body-strong text-text-secondary xl:block">{todayCapitalized}</span>

        <span className="hidden sm:block">
          <SyncIndicator variant="header" />
        </span>

        <ThemeToggle />

        <button
          type="button"
          onClick={() => toast.info('Nenhuma notificação nova.')}
          aria-label="Notificações"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-secondary shadow-card transition-colors hover:text-brand"
        >
          <Bell size={19} />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-surface sm:pr-2"
              aria-label="Menu do usuário"
            >
              <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="sm" />
              <span className="hidden max-w-[160px] truncate text-body-strong text-text-primary sm:block">
                {user?.name}
              </span>
              <ChevronDown size={16} className="hidden text-text-secondary sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={`z-40 min-w-[200px] p-1.5 ${POPOVER_CLASS}`}>
              <DropdownMenu.Item
                onSelect={() => navigate('/configuracoes')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-body text-text-primary outline-none data-[highlighted]:bg-tint"
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
