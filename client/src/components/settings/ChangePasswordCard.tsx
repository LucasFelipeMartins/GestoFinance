import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/authService';
import { getApiErrorMessage, getApiFieldErrors } from '@/services/api';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Repita a nova senha.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não são iguais.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual.',
  });

type FormValues = z.infer<typeof schema>;

/** "Quero trocar minha senha" — for someone who still knows the current one.
 * Forgotten passwords go through the e-mail link on the login page. */
export function ChangePasswordCard() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(undefined);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      toast.success('Senha alterada com sucesso.');
      reset();
      setOpen(false);
    } catch (error) {
      const fields = getApiFieldErrors(error);
      if (fields?.currentPassword) {
        setError('currentPassword', { message: fields.currentPassword });
      } else if (fields?.newPassword) {
        setError('newPassword', { message: fields.newPassword });
      } else {
        setServerError(getApiErrorMessage(error, 'Não foi possível alterar a senha.'));
      }
    }
  };

  return (
    <Card className="mx-auto w-full max-w-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-sage-green">
            <KeyRound size={20} />
          </span>
          <div>
            <h3 className="text-h3 text-text-primary">Senha</h3>
            <p className="text-caption text-text-secondary">Troque sua senha quando quiser.</p>
          </div>
        </div>
        {!open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Alterar senha
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex animate-fade-up flex-col gap-4" noValidate>
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <PasswordInput
            label="Nova senha"
            autoComplete="new-password"
            hint="Mínimo de 6 caracteres."
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordInput
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {serverError && (
            <p role="alert" className="rounded-input bg-danger/10 px-4 py-3 text-body text-danger">
              {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                setServerError(undefined);
                setOpen(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<ShieldCheck size={18} />}>
              Salvar nova senha
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
