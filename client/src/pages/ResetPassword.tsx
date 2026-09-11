import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck, LinkIcon } from 'lucide-react';
import { authService } from '@/services/authService';
import { getApiErrorMessage } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { AuthLayout, AuthError } from '@/components/layout/AuthLayout';

const schema = z
  .object({
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Repita a nova senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não são iguais.',
  });

type FormValues = z.infer<typeof schema>;

type LinkState = { status: 'checking' } | { status: 'valid'; email: string } | { status: 'invalid'; message: string };

/**
 * Where the e-mailed link lands. The token is checked up front so an
 * expired link says so immediately instead of after the person has typed
 * and confirmed a new password.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  const [link, setLink] = useState<LinkState>({ status: 'checking' });
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let active = true;
    if (!token) {
      setLink({ status: 'invalid', message: 'Este link está incompleto. Abra o link exatamente como veio no e-mail.' });
      return;
    }
    authService
      .checkResetToken(token)
      .then((result) => active && setLink({ status: 'valid', email: result.email }))
      .catch((error) => {
        if (!active) return;
        setLink({
          status: 'invalid',
          message: getApiErrorMessage(error, 'Este link expirou ou já foi usado.'),
        });
      });
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    setServerError(undefined);
    try {
      await authService.resetPassword(token, values.password);
      toast.success('Senha redefinida! Entre com a nova senha.');
      navigate('/entrar', { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível redefinir a senha.'));
    }
  };

  if (link.status === 'checking') {
    return (
      <AuthLayout title="Redefinir senha">
        <div className="flex items-center gap-3 text-body text-text-secondary">
          <Loader2 size={20} className="animate-spin text-sage-green" />
          Conferindo o link…
        </div>
      </AuthLayout>
    );
  }

  if (link.status === 'invalid') {
    return (
      <AuthLayout
        title="Link inválido"
        footer={
          <Link to="/entrar" className="font-semibold text-sage-green hover:underline">
            Voltar para entrar
          </Link>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-input bg-danger/10 px-4 py-3 text-body text-danger">
            <LinkIcon size={20} className="mt-0.5 shrink-0" />
            <span>{link.message}</span>
          </div>
          <Link to="/esqueci-senha">
            <Button className="w-full">Pedir um novo link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Criar nova senha"
      description={
        <>
          Para a conta <strong className="text-text-primary">{link.email}</strong>. Escolha uma senha com pelo
          menos 6 caracteres.
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <PasswordInput
          label="Nova senha"
          autoComplete="new-password"
          hint="Toque no olho para conferir o que digitou."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Confirmar senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <AuthError message={serverError} />

        <Button type="submit" isLoading={isSubmitting} leftIcon={<ShieldCheck size={18} />} className="mt-2 w-full">
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
