import { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { CARD_CLASS } from './Card';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={`${CARD_CLASS} overflow-x-auto`}>
      <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-bg-app/70">{children}</thead>;
}

export function Th({ children, className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-3.5 py-3.5 text-caption font-semibold uppercase tracking-wide text-text-secondary ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Tr({ children, className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`transition-colors duration-150 hover:bg-bg-app/60 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-3.5 py-3.5 align-middle text-body text-text-primary ${className}`} {...props}>
      {children}
    </td>
  );
}
