import { HTMLAttributes, ReactNode } from 'react';

export type CardPadding = 'md' | 'sm' | 'none';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  /** `md` for panels, `sm` for list rows and stat tiles, `none` when the
   * content brings its own padding (tables). */
  padding?: CardPadding;
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  md: 'p-5 sm:p-6',
  sm: 'p-4',
  none: '',
};

/** The one surface every panel, tile and list row sits on. Same radius,
 * border and shadow everywhere, so nothing reads as "a different box". */
export const CARD_CLASS = 'rounded-card border border-border bg-surface shadow-card';

export function Card({ children, className = '', hoverable, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={`${CARD_CLASS} ${PADDING_CLASSES[padding]}
        ${hoverable ? 'transition-all duration-200 ease-gentle hover:-translate-y-0.5 hover:shadow-elevated' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
