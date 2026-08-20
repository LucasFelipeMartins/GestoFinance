import { MouseEvent } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useSetTaskReminder } from '@/hooks/useTasks';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { requestNotificationPermission } from '@/services/notifications';
import { TaskWithClient } from '@/types';
import { hasExplicitTime } from '@/utils/formatters';

/** Opt-in toggle for the 5h-before-due reminder. Only actionable on tasks
 * with an explicit due time (see hasExplicitTime) — a date-only prazo has no
 * precise instant to count 5 hours back from. */
export function ReminderBell({ task }: { task: TaskWithClient }) {
  const setReminder = useSetTaskReminder();
  const toast = useToast();

  const eligible = task.status !== 'completed' && hasExplicitTime(task.dueDate);
  const enabled = Boolean(task.reminderEnabled) && eligible;

  const handleClick = async (event: MouseEvent) => {
    event.stopPropagation();

    if (!eligible) {
      toast.error('Defina um horário de entrega para ativar o lembrete.');
      return;
    }

    const nextEnabled = !enabled;
    if (nextEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Permita notificações para ativar o lembrete.');
        return;
      }
    }

    try {
      await setReminder.mutateAsync({ id: task.id, enabled: nextEnabled });
      toast.success(nextEnabled ? 'Lembrete ativado — aviso 5h antes do prazo.' : 'Lembrete desativado.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <IconButton
      icon={enabled ? <BellRing size={16} className="text-sage-green" /> : <Bell size={16} />}
      label={enabled ? 'Desativar lembrete de prazo' : 'Ativar lembrete 5h antes do prazo'}
      onClick={handleClick}
      disabled={setReminder.isPending || (!eligible && !task.reminderEnabled)}
    />
  );
}
