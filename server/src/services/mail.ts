import nodemailer, { Transporter } from 'nodemailer';
import { env, mailProvider } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const DEFAULT_FROM_NAME = 'GestorFinance';

function resolveFrom(): string {
  if (env.mail.from) return env.mail.from;
  // Resend lets any account send from this address while a domain isn't
  // verified yet (delivery limited to the account owner's own e-mail).
  if (env.mail.resendApiKey) return `${DEFAULT_FROM_NAME} <onboarding@resend.dev>`;
  if (env.mail.smtp.user) return `${DEFAULT_FROM_NAME} <${env.mail.smtp.user}>`;
  return `${DEFAULT_FROM_NAME} <no-reply@gestorpro.local>`;
}

async function sendViaResend(message: MailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mail.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resolveFrom(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend respondeu ${response.status}: ${body}`);
  }
}

let smtpTransport: Transporter | null = null;

async function sendViaSmtp(message: MailMessage): Promise<void> {
  if (!smtpTransport) {
    const { host, port, secure, user } = env.mail.smtp;
    // Google shows app passwords as "xxxx xxxx xxxx xxxx"; the spaces are
    // display-only and people paste them as-is.
    const pass = host?.includes('gmail') ? env.mail.smtp.pass?.replace(/\s+/g, '') : env.mail.smtp.pass;
    smtpTransport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
  await smtpTransport.sendMail({ from: resolveFrom(), ...message });
}

/**
 * Sends one e-mail through whichever provider the environment configures.
 *
 * Throws a 503 ApiError when nothing is configured in production — the
 * caller turns that into a clear message instead of a silent "sent" that
 * never arrives. In development the message is printed to the console so
 * the code/link can be picked up without any mail account.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const provider = mailProvider();

  try {
    if (provider === 'resend') {
      await sendViaResend(message);
      return;
    }
    if (provider === 'smtp') {
      await sendViaSmtp(message);
      return;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mail] envio falhou', err);
    throw new ApiError(502, 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
  }

  if (provider === 'console') {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail] (sem provedor configurado — e-mail NÃO enviado)\n` +
        `  Para: ${message.to}\n  Assunto: ${message.subject}\n\n${message.text}\n`
    );
    return;
  }

  throw new ApiError(
    503,
    'O envio de e-mails ainda não foi configurado neste servidor. Defina RESEND_API_KEY ou SMTP_* nas variáveis de ambiente.'
  );
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const BRAND_DARK = '#243119';
const BRAND_ACCENT = '#629460';
const BRAND_TINT = '#E4F5E2';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The shared frame every message uses: logo strip, white card, footer. */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#F7FAF5;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#182014;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAF5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 0 16px 0;font-size:20px;font-weight:700;color:${BRAND_DARK};">GestorFinance</td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;border:1px solid #DDE7D9;border-radius:18px;padding:28px 28px 24px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#182014;">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px 0;font-size:12px;line-height:1.5;color:#66705F;">
                Você recebeu esta mensagem porque este e-mail foi informado no GestorFinance.
                Se não foi você, pode ignorar este e-mail com segurança.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function registrationCodeEmail(input: {
  to: string;
  name: string;
  code: string;
  minutes: number;
}): MailMessage {
  const firstName = input.name.trim().split(/\s+/)[0] || 'Olá';
  const digits = input.code.split('').join(' ');

  const text =
    `${firstName}, seu código de confirmação do GestorFinance é: ${input.code}\n\n` +
    `Digite este código na tela de criação de conta para confirmar seu e-mail. ` +
    `Ele vale por ${input.minutes} minutos.\n\n` +
    `Se você não pediu este código, ignore esta mensagem.`;

  const html = layout(
    'Confirme seu e-mail',
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#182014;">
        ${escapeHtml(firstName)}, use o código abaixo para confirmar seu e-mail e concluir a criação da sua conta.
     </p>
     <div style="margin:0 0 20px;padding:18px;border-radius:14px;background:${BRAND_TINT};text-align:center;">
        <span style="font-size:32px;letter-spacing:6px;font-weight:700;color:${BRAND_DARK};font-variant-numeric:tabular-nums;">${escapeHtml(digits)}</span>
     </div>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#66705F;">
        O código vale por ${input.minutes} minutos. Se você não pediu este código, ignore esta mensagem.
     </p>`
  );

  return { to: input.to, subject: `${input.code} é o seu código de confirmação — GestorFinance`, text, html };
}

export function passwordResetEmail(input: {
  to: string;
  name: string;
  link: string;
  minutes: number;
}): MailMessage {
  const firstName = input.name.trim().split(/\s+/)[0] || 'Olá';

  const text =
    `${firstName}, recebemos um pedido para redefinir a senha da sua conta no GestorFinance.\n\n` +
    `Abra o link abaixo para escolher uma nova senha (vale por ${input.minutes} minutos):\n${input.link}\n\n` +
    `Se você não pediu isso, ignore esta mensagem — sua senha continua a mesma.`;

  const html = layout(
    'Redefinir sua senha',
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#182014;">
        ${escapeHtml(firstName)}, recebemos um pedido para redefinir a senha da sua conta.
        Clique no botão abaixo para escolher uma nova senha.
     </p>
     <p style="margin:0 0 20px;text-align:center;">
        <a href="${escapeHtml(input.link)}"
           style="display:inline-block;padding:14px 26px;border-radius:12px;background:${BRAND_DARK};color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;">
           Criar nova senha
        </a>
     </p>
     <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#66705F;">
        O link vale por ${input.minutes} minutos e só pode ser usado uma vez.
        Se o botão não funcionar, copie e cole este endereço no navegador:
     </p>
     <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND_ACCENT};">${escapeHtml(input.link)}</p>`
  );

  return { to: input.to, subject: 'Redefinir sua senha — GestorFinance', text, html };
}

/** To the owner: a Pix refund Mercado Pago would not process — pay it back by hand. */
export function manualRefundEmail(input: {
  to: string;
  userName: string;
  userEmail: string;
  paymentId: string;
  method: string;
  amount: number;
  reason: string;
}): MailMessage {
  const amount = input.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const text =
    `Um cliente cancelou o plano e o estorno proporcional NÃO foi feito automaticamente.\n\n` +
    `Cliente: ${input.userName} <${input.userEmail}>\n` +
    `Pagamento Mercado Pago: ${input.paymentId} (${input.method})\n` +
    `Valor a devolver: ${amount}\n` +
    `Motivo: ${input.reason}\n\n` +
    `Faça a devolução pelo painel do Mercado Pago (Atividade → pagamento → Devolver) ou por Pix.`;

  const html = layout(
    'Estorno manual necessário',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#182014;">
        Um cliente cancelou o plano e o estorno proporcional <strong>não foi feito automaticamente</strong>.
     </p>
     <table style="border-collapse:collapse;font-size:14px;line-height:1.7;color:#182014;">
       <tr><td style="padding-right:12px;color:#66705F;">Cliente</td><td>${escapeHtml(input.userName)} &lt;${escapeHtml(input.userEmail)}&gt;</td></tr>
       <tr><td style="padding-right:12px;color:#66705F;">Pagamento</td><td>${escapeHtml(input.paymentId)} (${escapeHtml(input.method)})</td></tr>
       <tr><td style="padding-right:12px;color:#66705F;">Valor a devolver</td><td><strong>${escapeHtml(amount)}</strong></td></tr>
       <tr><td style="padding-right:12px;color:#66705F;">Motivo</td><td>${escapeHtml(input.reason)}</td></tr>
     </table>
     <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#66705F;">
        Faça a devolução pelo painel do Mercado Pago (Atividade → pagamento → Devolver) ou por Pix.
     </p>`
  );

  return {
    to: input.to,
    subject: `Estorno manual: ${amount} para ${input.userEmail} — GestorFinance`,
    text,
    html,
  };
}
