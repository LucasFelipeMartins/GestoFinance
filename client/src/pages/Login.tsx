import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { AuthLayout, AuthError } from '@/components/layout/AuthLayout';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
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
    <AuthLayout
      title="Entrar na sua conta"
      description="Cada conta é individual — entre com seu e-mail para acessar apenas os seus dados."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-sage-green hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          leftIcon={<Mail size={18} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Senha"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Link
            to="/esqueci-senha"
            className="self-end text-caption font-semibold text-sage-green hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>

        <AuthError message={serverError} />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
