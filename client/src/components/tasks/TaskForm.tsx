import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/types';
import { useClients } from '@/hooks/useClients';

const schema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório.'),
  description: z.string().trim().optional(),
  clientId: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'very-low'], { message: 'Selecione uma prioridade.' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
});

export type TaskFormValues = z.infer<typeof schema>;

interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  lockedClientId?: string;
}

export function TaskForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Salvar Tarefa',
  lockedClientId,
}: TaskFormProps) {
  const { data: clients } = useClients();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      clientId: lockedClientId ?? '',
      dueDate: '',
      dueTime: '',
      priority: 'medium',
      status: 'pending',
      ...defaultValues,
    },
  });

  const clientOptions = [
    { value: '', label: 'Nenhum cliente' },
    ...(clients ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input label="Título" placeholder="Ex: Instalar impressora" error={errors.title?.message} {...register('title')} />

      <Textarea
        label="Descrição"
        placeholder="Detalhes sobre a tarefa (opcional)"
        rows={3}
        error={errors.description?.message}
        {...register('description')}
      />

      <Controller
        control={control}
        name="clientId"
        render={({ field }) => (
          <Select
            label="Cliente relacionado"
            options={clientOptions}
            value={field.value}
            onChange={field.onChange}
            disabled={Boolean(lockedClientId)}
          />
        )}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input label="Prazo" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
        </div>
        <div className="flex-1">
          <Input label="Horário (opcional)" type="time" error={errors.dueTime?.message} {...register('dueTime')} />
        </div>
      </div>

      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <Select
            label="Prioridade"
            placeholder="Selecionar prioridade"
            options={PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
            value={field.value}
            onChange={field.onChange}
            error={errors.priority?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Select
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
