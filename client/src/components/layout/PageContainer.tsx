import { ReactNode } from 'react';

/** The page body. One max width, one gutter, one vertical rhythm for every
 * screen; the bottom padding clears the mobile nav bar. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-5 pb-28 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:pb-10">
      {children}
    </div>
  );
}
