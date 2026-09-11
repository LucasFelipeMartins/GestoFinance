import { ReactNode } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import { Select, SelectOption } from './Select';
import { SearchInput } from './SearchInput';
import { Button } from './Button';

/**
 * The filter/sort row above every list.
 *
 * Phones stack: search, then filters two per row, then sorting. From the
 * `sm` breakpoint up everything sits on one wrapping line with fixed widths,
 * so a long client name can never push a control onto its own line.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function FilterSearch(props: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <SearchInput {...props} className="w-full sm:w-72 lg:w-80" />;
}

/** A group of Selects: two per row on phones, side by side otherwise. */
export function FilterGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">{children}</div>;
}

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
}) {
  return (
    <div className="min-w-0 sm:w-44" aria-label={ariaLabel ?? placeholder}>
      <Select options={options} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

interface SortControlProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  order?: 'asc' | 'desc';
  onToggleOrder?: () => void;
}

export function SortControl({ options, value, onChange, order, onToggleOrder }: SortControlProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
        <Select options={options} value={value} onChange={onChange} placeholder="Ordenar" />
      </div>
      {onToggleOrder && (
        <button
          type="button"
          onClick={onToggleOrder}
          aria-label={order === 'asc' ? 'Ordem crescente — clique para inverter' : 'Ordem decrescente — clique para inverter'}
          title={order === 'asc' ? 'Crescente' : 'Decrescente'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-border bg-surface text-text-secondary transition-colors hover:border-sage-green/60 hover:text-brand"
        >
          <ArrowUpDown
            size={17}
            className={`transition-transform duration-200 ${order === 'asc' ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" leftIcon={<X size={16} />} onClick={onClick} className="self-start sm:self-auto">
      Limpar filtros
    </Button>
  );
}
