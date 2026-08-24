import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  CheckSquare,
  Settings,
  LogOut,
  Handshake,
  TrendingUp,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { SyncIndicator } from './SyncIndicator';
import { DownloadAppButton } from './DownloadAppButton';

/**
 * Two sections rather than one flat list: with six destinations, grouping
 * "o que você faz" apart from "quanto isso rende" keeps the sidebar
 * scannable instead of turning it into a wall of links.
 */
const NAV_SECTIONS = [
  {
    title: 'Operação',
    items: [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/lucros', label: 'Lucros', icon: TrendingUp },
      { to: '/despesas', label: 'Despesas', icon: Receipt },
      { to: '/investimentos', label: 'Investimentos', icon: PiggyBank },
    ],
  },
];

export function Sidebar() {
  const { requestLogout, dialog } = useLogoutConfirm();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-body-strong transition-all duration-200 ease-gentle ${
      isActive ? 'bg-tea-green text-evergreen' : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col overflow-y-auto bg-evergreen px-4 py-6 text-white lg:flex">
      <div className="mb-7 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10">
          <Handshake size={22} className="text-tea-green" />
        </span>
        <div>
          <p className="text-h3 leading-tight text-white">GestorPro</p>
          <p className="text-caption text-white/60">Clientes · Tarefas · Finanças</p>
        </div>
      </div>

      <div className="mb-5 px-2">
        <SyncIndicator variant="sidebar" />
      </div>

      <nav className="flex flex-1 flex-col gap-6" aria-label="Navegação principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="mb-1 px-4 text-micro font-semibold uppercase tracking-wider text-white/40">
              {section.title}
            </p>
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon size={19} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <NavLink to="/configuracoes" className={linkClass}>
          <Settings size={19} aria-hidden="true" />
          Configurações
        </NavLink>
        <button
          type="button"
          onClick={requestLogout}
          className="flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-body-strong text-white/85 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={19} aria-hidden="true" />
          Sair
        </button>

        <div className="mt-3 border-t border-white/10 pt-3">
          <DownloadAppButton />
        </div>
      </div>
      {dialog}
    </aside>
  );
}
