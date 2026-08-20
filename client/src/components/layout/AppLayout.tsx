import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { useTasks, useSetTaskReminder } from '@/hooks/useTasks';
import { reconcileReminders } from '@/services/notifications';

export function AppLayout() {
  // Runs whenever the task list changes (create/edit/delete/sync-pull all
  // invalidate the ['tasks'] query) so on-device reminder scheduling always
  // reflects the latest reminderEnabled/dueDate/status per task.
  const { data: tasks } = useTasks();
  const setReminder = useSetTaskReminder();
  useEffect(() => {
    if (!tasks) return;
    reconcileReminders(tasks).then((handledIds) => {
      // Reminder window already passed (fired now or earlier) — turn the
      // opt-in off so it doesn't keep re-triggering on every reconcile pass.
      handledIds.forEach((id) => setReminder.mutate({ id, enabled: false }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <div className="lg:pl-[250px]">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
