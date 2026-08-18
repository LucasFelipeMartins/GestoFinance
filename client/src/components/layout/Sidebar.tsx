import { NavLink } from 'react-router-dom';
import { Home, Users, CheckSquare, Settings, LogOut, Handshake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const MAIN_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
];

export function Sidebar() {
  const { logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-[12px] px-4 py-3 text-body-strong transition-all duration-200 ease-gentle ${
      isActive ? 'bg-tea-green text-evergreen' : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-evergreen px-4 py-6 text-white lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10">
          <Handshake size={22} className="text-tea-green" />
        </span>
        <div>
          <p className="text-h3 leading-tight text-white">GestorPro</p>
          <p className="text-caption text-white/60">Clientes · Tarefas</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {MAIN_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <NavLink to="/configuracoes" className={linkClass}>
          <Settings size={20} aria-hidden="true" />
          Configurações
        </NavLink>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-[12px] px-4 py-3 text-body-strong text-white/85 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={20} aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  );
}
