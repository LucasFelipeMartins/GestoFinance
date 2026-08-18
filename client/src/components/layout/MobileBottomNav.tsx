import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Home, Users, CheckSquare, MoreHorizontal, Plus, UserPlus, ListPlus } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
];

const ITEMS_RIGHT = [
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { to: '/configuracoes', label: 'Mais', icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-micro transition-colors duration-200 ${
      isActive ? 'text-evergreen' : 'text-text-secondary'
    }`;

  const goTo = (path: string) => {
    setSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navegação inferior"
      >
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}

        <div className="flex flex-1 items-center justify-center">
          <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Adicionar"
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white shadow-elevated
                  transition-transform duration-200 ease-gentle active:scale-95"
              >
                <Plus size={26} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-evergreen/40 animate-backdrop-in" />
              <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-modal bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-elevated animate-modal-in">
                <Dialog.Title className="mb-4 text-h3 text-text-primary">Adicionar</Dialog.Title>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => goTo('/clientes?new=1')}
                    className="flex items-center gap-3 rounded-input border border-border px-4 py-3.5 text-body-strong text-text-primary hover:bg-tea-green/30"
                  >
                    <UserPlus size={20} className="text-sage-green" />
                    Adicionar Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('/tarefas?new=1')}
                    className="flex items-center gap-3 rounded-input border border-border px-4 py-3.5 text-body-strong text-text-primary hover:bg-tea-green/30"
                  >
                    <ListPlus size={20} className="text-sage-green" />
                    Adicionar Tarefa
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {ITEMS_RIGHT.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
