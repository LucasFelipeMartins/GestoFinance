import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MailCheck, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { getApiErrorMessage } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthLayout, AuthError } from '@/components/layout/AuthLayout';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
});

type FormValues = z.infer<typeof schema>;

/** "Esqueci minha senha": asks for the e-mail and sends the reset link. */
export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string>();
  const [expiresIn, setExpiresIn] = useState(30);
  const [devLink, setDevLink] = useState<string>();
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const send = async (email: string) => {
    setServerError(undefined);
    try {
      const response = await authService.forgotPassword(email);
      setExpiresIn(response.expiresInMinutes);
      setDevLink(response.devLink);
      setSentTo(email);
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível enviar o e-mail.'));
    }
  };

  const backToLogin = (
    <Link to="/entrar" className="inline-flex items-center gap-1.5 font-semibold text-sage-green hover:underline">
      <ArrowLeft size={15} />
      Voltar para entrar
    </Link>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Verifique seu e-mail" footer={backToLogin}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-input bg-tint px-4 py-3 text-body text-text-primary">
            <MailCheck size={20} className="mt-0.5 shrink-0 text-sage-green" />
            <span>
              Se <strong>{sentTo}</strong> estiver cadastrado, você vai receber um link para criar uma nova senha.
              O link vale por {expiresIn} minutos.
            </span>
          </div>
          <p className="text-body text-text-secondary">
            Não chegou? Confira a caixa de spam ou promoções. Se o e-mail estiver errado, volte e tente de novo.
          </p>

          {devLink && (
            <p className="break-all rounded-input border border-dashed border-border px-4 py-2.5 text-caption text-text-secondary">
              Ambiente de desenvolvimento (sem e-mail configurado) — abra este link:{' '}
              <a href={devLink} className="font-semibold text-sage-green underline">
                {devLink}
              </a>
            </p>
          )}

          <AuthError message={serverError} />

          <Button variant="secondary" className="w-full" onClick={() => send(getValues('email') || sentTo)}>
            Enviar de novo
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      description="Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha."
      footer={backToLogin}
    >
      <form onSubmit={handleSubmit((values) => send(values.email))} className="flex flex-col gap-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          leftIcon={<Mail size={18} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthError message={serverError} />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Enviar link
        </Button>
      </form>
    </AuthLayout>
  );
}
