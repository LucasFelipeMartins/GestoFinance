import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, User, MailCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage, getApiFieldErrors } from '@/services/api';
import { passwordField, PASSWORD_HINT } from '@/utils/password';

const CODE_LENGTH = 5;
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { CodeInput } from '@/components/ui/CodeInput';
import { Button } from '@/components/ui/Button';
import { AuthLayout, AuthError } from '@/components/layout/AuthLayout';

const schema = z
  .object({
    name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Repita a senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não são iguais.',
  });

type FormValues = z.infer<typeof schema>;

const RESEND_SECONDS = 60;

/**
 * Sign-up in two steps. The account only exists after the e-mailed code is
 * typed back, so nobody can register an address that isn't theirs — and a
 * typo in the e-mail is caught before it locks someone out of "esqueci
 * minha senha" later.
 */
export default function Register() {
  const { requestRegisterCode, register: registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'details' | 'code'>('details');
  const [details, setDetails] = useState<FormValues>();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const [devCode, setDevCode] = useState<string>();
  const [expiresIn, setExpiresIn] = useState(15);
  const [resendIn, setResendIn] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const sendCode = async (values: FormValues) => {
    const response = await requestRegisterCode({ name: values.name, email: values.email });
    setExpiresIn(response.expiresInMinutes);
    setDevCode(response.devCode);
    setResendIn(RESEND_SECONDS);
  };

  const onSubmitDetails = async (values: FormValues) => {
    setServerError(undefined);
    try {
      await sendCode(values);
      setDetails(values);
      setCode('');
      setCodeError(undefined);
      setStep('code');
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível enviar o código.'));
    }
  };

  const verify = async (value: string) => {
    if (!details || value.length !== CODE_LENGTH || isVerifying) return;
    setIsVerifying(true);
    setCodeError(undefined);
    setServerError(undefined);
    try {
      await registerUser({
        name: details.name,
        email: details.email,
        password: details.password,
        code: value,
      });
      toast.success('Conta criada! Bem-vindo ao GestorFinance.');
      navigate('/', { replace: true });
    } catch (error) {
      const fields = getApiFieldErrors(error);
      if (fields?.code) {
        setCodeError(fields.code);
      } else if (fields?.password || fields?.name || fields?.email) {
        // The server refused something typed on the first screen (a weak
        // password, say): go back there and point at the field instead of
        // blaming the code.
        for (const key of ['password', 'name', 'email'] as const) {
          if (fields[key]) setError(key, { type: 'server', message: fields[key] });
        }
        setStep('details');
        setServerError('Revise os dados destacados e peça um novo código.');
      } else {
        setServerError(getApiErrorMessage(error, 'Não foi possível criar sua conta.'));
      }
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (!details || resendIn > 0) return;
    setIsResending(true);
    setServerError(undefined);
    setCodeError(undefined);
    try {
      await sendCode(details);
      toast.success('Enviamos um novo código.');
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Não foi possível reenviar o código.'));
    } finally {
      setIsResending(false);
    }
  };

  if (step === 'code' && details) {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        description={
          <>
            Enviamos um código de {CODE_LENGTH} números para{' '}
            <strong className="text-text-primary">{details.email}</strong>. Digite-o abaixo para concluir. Ele
            vale por {expiresIn} minutos.
          </>
        }
        footer={
          <button
            type="button"
            onClick={() => {
              setStep('details');
              setServerError(undefined);
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-sage-green hover:underline"
          >
            <ArrowLeft size={15} />
            Corrigir e-mail ou dados
          </button>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-input bg-tint px-4 py-3 text-body text-text-primary">
            <MailCheck size={20} className="shrink-0 text-sage-green" />
            <span>
              Não chegou? Veja a caixa de <strong>spam</strong> ou <strong>promoções</strong>.
            </span>
          </div>

          <CodeInput
            length={CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (codeError) setCodeError(undefined);
            }}
            onComplete={verify}
            error={codeError}
            disabled={isVerifying}
            autoFocus
          />

          {devCode && (
            <p className="rounded-input border border-dashed border-border px-4 py-2.5 text-caption text-text-secondary">
              Ambiente de desenvolvimento (sem e-mail configurado) — seu código é{' '}
              <strong className="tabular-nums text-text-primary">{devCode}</strong>.
            </p>
          )}

          <AuthError message={serverError} />

          <Button
            type="button"
            onClick={() => verify(code)}
            isLoading={isVerifying}
            disabled={code.length !== CODE_LENGTH}
            className="w-full"
          >
            Criar conta
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={resend}
            isLoading={isResending}
            disabled={resendIn > 0}
            leftIcon={<RefreshCw size={16} />}
            className="w-full"
          >
            {resendIn > 0 ? `Reenviar código em ${resendIn}s` : 'Reenviar código'}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Criar sua conta"
      description="Seus clientes, tarefas e finanças ficam vinculados somente à sua conta."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/entrar" className="font-semibold text-sage-green hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmitDetails)} className="flex flex-col gap-4" noValidate>
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
          inputMode="email"
          leftIcon={<Mail size={18} />}
          hint="Você vai receber um código neste e-mail para confirmar a conta."
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Senha"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
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

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Continuar
        </Button>
      </form>
    </AuthLayout>
  );
}
