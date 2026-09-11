import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  /** `header` sits on the app background; `plain` has no shell of its own. */
  variant?: 'header' | 'plain';
}

/** The light/dark switch. One icon that shows what you'll get by clicking. */
export function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';

  const shell =
    variant === 'header'
      ? 'h-10 w-10 rounded-full bg-surface text-text-secondary shadow-card hover:text-brand'
      : 'h-10 w-10 rounded-full text-text-secondary hover:bg-tint hover:text-brand';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={`relative flex shrink-0 items-center justify-center transition-colors duration-200 ${shell}`}
    >
      <Sun
        size={19}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ease-gentle ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
        }`}
      />
      <Moon
        size={19}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ease-gentle ${
          isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      />
    </button>
  );
}
