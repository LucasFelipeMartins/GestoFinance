import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { PercentRing } from '@/components/ui/PercentRing';

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  caption: string;
  percent?: number;
  attention?: boolean;
}

export function SummaryCard({ icon, label, value, caption, percent, attention }: SummaryCardProps) {
  return (
    <Card className="flex items-center gap-4" hoverable>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-tea-green/60 text-sage-green">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body text-text-secondary">{label}</p>
        <p className="text-h1-mobile text-text-primary">{value}</p>
        <p className={`text-caption ${attention ? 'font-semibold text-danger' : 'text-text-secondary'}`}>{caption}</p>
      </div>
      {percent !== undefined && <PercentRing value={percent} />}
    </Card>
  );
}
