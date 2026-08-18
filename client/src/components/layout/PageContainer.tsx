import { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">{children}</div>;
}
