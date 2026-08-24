import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Primary action for the page, right-aligned on desktop. */
  action?: ReactNode;
  /** Small label above the title (a section name, a period). */
  eyebrow?: ReactNode;
}

/**
 * The standard page heading. Every page uses it so the title, the supporting
 * line and the primary action land in the same place on every screen.
 */
export function PageHeader({ title, subtitle, action, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-sage-green">
            {eyebrow}
          </p>
        )}
        <h2 className="text-h2 text-text-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-body text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
