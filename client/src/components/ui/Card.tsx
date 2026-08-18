import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, className = '', hoverable, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-white p-5 shadow-card sm:p-6
        ${hoverable ? 'transition-shadow duration-200 hover:shadow-elevated hover:-translate-y-0.5' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
