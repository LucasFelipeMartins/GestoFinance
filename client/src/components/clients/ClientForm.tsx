import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { maskPhone, getInitials } from '@/utils/formatters';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, Client } from '@/types';
import { useSync } from '@/context/SyncContext';

const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;

const schema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres.'),
  phone: z.string().regex(phoneRegex, 'Informe um telefone válido no formato (99) 99999-9999.'),
  service: z.string().trim().min(1, 'O serviço é obrigatório.'),
  price: z.coerce.number({ message: 'Informe um valor.' }).min(0, 'Informe um valor maior ou igual a R$ 0,00.'),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'very-low'], { message: 'Selecione uma prioridade.' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  deliveryDate: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof schema>;

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  currentAvatarUrl?: string;
  onSubmit: (values: ClientFormValues, avatarFile: File | null) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ClientForm({
  defaultValues,
  currentAvatarUrl,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Salvar Cliente',
}: ClientFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentAvatarUrl);
  const { isOnline } = useSync();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      service: '',
      price: 0,
      priority: 'medium',
      status: 'pending',
      deliveryDate: '',
      ...defaultValues,
    },
  });

  const nameValue = watch('name');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      window.alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values, avatarFile))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
          aria-label="Enviar foto do cliente"
        >
          <Avatar name={nameValue || 'Cliente'} initials={getInitials(nameValue || '')} src={avatarPreview} size="xl" />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-evergreen text-white shadow-card transition-transform group-hover:scale-105">
            <Camera size={15} />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {!isOnline && (
          <p className="text-caption text-text-secondary">Enviar foto requer conexão com a internet.</p>
        )}
      </div>

      <Input label="Nome" placeholder="Nome do cliente" error={errors.name?.message} {...register('name')} />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Input
            label="Número"
            placeholder="(00) 00000-0000"
            inputMode="numeric"
            error={errors.phone?.message}
            value={field.value}
            onChange={(e) => field.onChange(maskPhone(e.target.value))}
            onBlur={field.onBlur}
          />
        )}
      />

      <Input
        label="Serviço"
        placeholder="Ex: Manutenção de notebook"
        error={errors.service?.message}
        {...register('service')}
      />

      <Input
        label="Preço"
        type="number"
        step="0.01"
        min="0"
        placeholder="0,00"
        error={errors.price?.message}
        {...register('price')}
      />

      <Input
        label="Data de entrega"
        type="date"
        hint="Opcional. Usada para mostrar quanto tempo falta para a entrega."
        error={errors.deliveryDate?.message}
        {...register('deliveryDate')}
      />

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
