import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Handshake, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres.'),
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
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
      await registerUser(values);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível criar sua conta.'));
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
          <h2 className="text-h2 text-text-primary">Criar sua conta</h2>
          <p className="mt-1 text-body text-text-secondary">
            Seus clientes e tarefas ficam vinculados somente à sua conta.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
            <Input
              label="Nome"
              autoComplete="name"
              leftIcon={<User size={18} />}
              error={errors.name?.message}
              {...register('name')}
            />
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
              autoComplete="new-password"
              leftIcon={<Lock size={18} />}
              hint="Mínimo de 6 caracteres."
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <p role="alert" className="rounded-input bg-danger/10 px-4 py-3 text-body text-danger">
                {serverError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-body text-text-secondary">
          Já tem uma conta?{' '}
          <Link to="/entrar" className="font-semibold text-sage-green hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
