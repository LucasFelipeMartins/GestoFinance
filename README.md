# GestorFinance

Clientes, tarefas e finanças em um só lugar. Web (React + Vite) e API (Express + MongoDB), publicados juntos na Vercel.

```bash
npm install
npm run dev      # API em http://localhost:4000 e site em http://localhost:5173
```

As variáveis do servidor ficam em `server/.env` (modelo em `server/.env.example`).

## Configurar o envio de e-mails (confirmação de cadastro e "esqueci minha senha")

Criar conta e redefinir senha dependem de um e-mail com código/link. Sem um provedor
configurado, o servidor responde:

> O envio de e-mails ainda não foi configurado neste servidor. Defina RESEND_API_KEY ou SMTP_* nas variáveis de ambiente.

Escolha **uma** das opções abaixo, coloque as variáveis no lugar certo e reinicie/redeploy.

### Onde colocar as variáveis

| Ambiente | Onde |
|---|---|
| Rodando no seu PC | arquivo `server/.env` (depois reinicie o `npm run dev`) |
| Site publicado na Vercel | painel da Vercel → projeto → **Settings → Environment Variables** → adicione cada variável (marque *Production* e *Preview*) → **Deployments → ⋯ → Redeploy** |

### Opção A — Gmail (mais simples para começar)

Funciona para qualquer destinatário; limite de ~500 e-mails por dia.

1. Na sua conta Google, ative a **verificação em duas etapas** (obrigatório para o passo 2).
2. Acesse <https://myaccount.google.com/apppasswords>, crie uma **senha de app** com o nome "GestorPro" e copie os 16 caracteres.
3. Defina:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx      # a senha de app (pode manter os espaços)
MAIL_FROM=GestorPro <seuemail@gmail.com>
```

Outros SMTP (Brevo, Mailgun, Outlook…) usam as mesmas variáveis com os dados do provedor.
Use `SMTP_PORT=465` junto com `SMTP_SECURE=true` se o provedor exigir SSL.

### Opção B — Resend (recomendado para o site publicado)

1. Crie uma conta em <https://resend.com> (plano gratuito: 3.000 e-mails/mês).
2. Em **API Keys → Create API Key**, copie a chave (`re_...`).
3. Defina:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

Sem domínio verificado, o Resend só entrega para o e-mail da própria conta (bom para testar).
Para entregar a qualquer pessoa: **Domains → Add Domain**, adicione os registros DNS que ele
mostrar e depois defina `MAIL_FROM=GestorPro <no-reply@seudominio.com.br>`.

### Opcional

```env
APP_URL=https://seu-site.vercel.app   # endereço usado nos links dos e-mails; sem ele o
                                      # servidor usa o endereço do próprio pedido
```

### Como testar

1. Abra o site → **Criar conta** → informe um e-mail seu → deve chegar um código de 6 dígitos.
2. Na tela de entrar → **Esqueci minha senha** → deve chegar um link que abre a tela de nova senha.
3. Se nada chegar: veja spam/promoções, confira os logs do servidor (na Vercel: **Deployments → Logs**) —
   uma falha de autenticação SMTP ou chave inválida aparece lá como `[mail] envio falhou`.

Em desenvolvimento local **sem** provedor configurado, o código e o link aparecem na própria tela
(e no console do servidor), para dar para testar o fluxo sem e-mail.

## Assinatura (R$ 11,90 a cada 30 dias, 7 dias grátis)

O app é vendido por assinatura pré-paga: toda conta nova ganha 7 dias grátis; depois disso a
pessoa paga R$ 11,90 (Pix, cartão ou boleto, via **Mercado Pago Checkout Pro**) e ganha 30 dias.
Pagando antes de vencer, os 30 dias somam ao que ainda falta. Perto do fim aparece um aviso
em todas as telas; vencido, o app leva para a página **Assinatura** até renovar.

Enquanto `MP_ACCESS_TOKEN` não estiver definido, **ninguém é bloqueado** — dá para publicar
tudo hoje e ligar a cobrança depois.

### 1. Mercado Pago

1. Crie/entre na conta em <https://www.mercadopago.com.br> (funciona com CPF).
2. Acesse <https://www.mercadopago.com.br/developers/panel/app> → **Criar aplicação** →
   tipo "Pagamentos online" / "Checkout Pro".
3. Em **Credenciais de produção**, copie o **Access Token** → `MP_ACCESS_TOKEN`.
   (Para testar sem dinheiro real use as **Credenciais de teste** e as contas de teste do painel.)
4. Em **Webhooks** (na mesma aplicação): URL `https://SEU-SITE/api/billing/webhook`, evento
   **Pagamentos**. Copie a **assinatura secreta** → `MP_WEBHOOK_SECRET`.
   O webhook é um reforço: ao voltar do pagamento o próprio app já confirma com o Mercado Pago,
   então mesmo sem ele o acesso é liberado (só o boleto, que compensa depois, depende do webhook
   ou de a pessoa abrir a página Assinatura de novo).

### 2. Você e as contas gratuitas

- `ADMIN_EMAILS=seuemail@gmail.com` (pode ter vários, separados por vírgula). Administradores
  nunca pagam e ganham em **Configurações** o painel **Contas gratuitas**.
- Nesse painel, informe o e-mail de quem não deve pagar (esposa, sócio…). Vale mesmo antes de a
  pessoa criar a conta.

### 3. Variáveis

Na Vercel (Settings → Environment Variables) e no `server/.env` local:

```env
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
ADMIN_EMAILS=seuemail@gmail.com
# opcionais: PLAN_PRICE_BRL=11.90  PLAN_PERIOD_DAYS=30  TRIAL_DAYS=7
```

Depois faça **Redeploy**. Contas já existentes ganham os 7 dias grátis a partir do primeiro
acesso após a ativação.
