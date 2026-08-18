import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Handshake, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(undefined);
    try {
      await login(values);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível entrar.'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-evergreen">
            <Handshake size={28} className="text-tea-green" />
          </span>
          <div>
            <h1 className="text-h1-mobile text-text-primary">GestorPro</h1>
            <p className="text-body text-text-secondary">Clientes &amp; Tarefas</p>
          </div>
        </div>

        <div className="rounded-card border border-border bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-h2 text-text-primary">Entrar na sua conta</h2>
          <p className="mt-1 text-body text-text-secondary">
            Cada conta é individual — entre com seu e-mail para acessar apenas os seus dados.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              leftIcon={<Mail size={18} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              leftIcon={<Lock size={18} />}
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <p role="alert" className="rounded-input bg-danger/10 px-4 py-3 text-body text-danger">
                {serverError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-body text-text-secondary">
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-sage-green hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
