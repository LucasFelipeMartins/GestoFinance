import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Home,
  Users,
  CheckSquare,
  MoreHorizontal,
  Plus,
  UserPlus,
  ListPlus,
  TrendingUp,
  Receipt,
  PiggyBank,
  Settings,
  Wallet,
  Flag,
} from 'lucide-react';

const ITEMS_LEFT = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
];

const ITEMS_RIGHT = [{ to: '/tarefas', label: 'Tarefas', icon: CheckSquare }];

/** `?new=1` is what every list page reads to open its form on arrival. */
const CREATE_ACTIONS = [
  { path: '/clientes?new=1', label: 'Adicionar cliente', icon: UserPlus, color: '#629460' },
  { path: '/tarefas?new=1', label: 'Adicionar tarefa', icon: ListPlus, color: '#629460' },
  { path: '/lucros?new=1', label: 'Adicionar lucro', icon: TrendingUp, color: '#008300' },
  { path: '/despesas?new=1', label: 'Adicionar despesa', icon: Receipt, color: '#E34948' },
  { path: '/investimentos?new=1', label: 'Adicionar investimento', icon: PiggyBank, color: '#2A78D6' },
  { path: '/metas?new=1', label: 'Criar meta', icon: Flag, color: '#629460' },
];

const MORE_LINKS = [
  { path: '/lucros', label: 'Lucros', icon: TrendingUp, color: '#008300' },
  { path: '/despesas', label: 'Despesas', icon: Receipt, color: '#E34948' },
  { path: '/investimentos', label: 'Investimentos', icon: PiggyBank, color: '#2A78D6' },
  { path: '/metas', label: 'Metas', icon: Flag, color: '#629460' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, color: '#629460' },
];

function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-evergreen/40 animate-backdrop-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-modal bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-elevated animate-modal-in">
          <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border" aria-hidden="true" />
          <Dialog.Title className="mb-4 text-h3 text-text-primary">{title}</Dialog.Title>
          <div className="flex flex-col gap-2.5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MobileBottomNav() {
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-micro transition-colors duration-200 ${
      isActive ? 'text-evergreen' : 'text-text-secondary'
    }`;

  const goTo = (path: string) => {
    setCreateOpen(false);
    setMoreOpen(false);
    navigate(path);
  };

  const rowClass =
    'flex items-center gap-3 rounded-input border border-border px-4 py-3.5 text-body-strong text-text-primary transition-colors hover:bg-bg-app active:scale-[0.99]';

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navegação inferior"
      >
        {ITEMS_LEFT.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}

        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Adicionar"
            onClick={() => setCreateOpen(true)}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white shadow-elevated
              transition-transform duration-200 ease-gentle active:scale-95"
          >
            <Plus size={26} />
          </button>
        </div>

        {ITEMS_RIGHT.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-micro text-text-secondary transition-colors duration-200"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          Mais
        </button>
      </nav>

      <Sheet open={createOpen} onOpenChange={setCreateOpen} title="Adicionar">
        {CREATE_ACTIONS.map(({ path, label, icon: Icon, color }) => (
          <button key={path} type="button" onClick={() => goTo(path)} className={rowClass}>
            <Icon size={20} style={{ color }} aria-hidden="true" />
            {label}
          </button>
        ))}
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Mais">
        <p className="-mt-1 mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-secondary">
          <Wallet size={13} />
          Financeiro
        </p>
        {MORE_LINKS.map(({ path, label, icon: Icon, color }) => (
          <button key={path} type="button" onClick={() => goTo(path)} className={rowClass}>
            <Icon size={20} style={{ color }} aria-hidden="true" />
            {label}
          </button>
        ))}
      </Sheet>
    </>
  );
}
