# 06 — Roteiro de correção (ordenado por redução de risco)

Nenhuma correção foi aplicada (APPLY_FIXES=false). Esforço estimado para um desenvolvedor familiarizado com o projeto.

## URGENTE — 24 a 48 h

| # | Ação | Achado | Esforço | Teste de aceitação |
|---|---|---|---|---|
| 1 | Apagar `demo@gestorpro.com` do banco de produção (ou trocar a senha por uma gerada e não publicada); em `server/src/seed.ts`, abortar quando `NODE_ENV=production` e gerar senha aleatória impressa no console | AUD-001 | 30 min | login com a senha do arquivo → 401 |
| 2 | Definir `APP_URL` na Vercel e torná-lo obrigatório em produção (`required('APP_URL')` quando `isProduction`); remover o ramo que aceita `Origin` genérico em `resolveAppUrl` | AUD-005 | 30 min | link no e-mail de reset começa com `APP_URL` mesmo com Host/Origin forjados |
| 3 | Tornar `MP_WEBHOOK_SECRET` obrigatório em produção; cadastrar o webhook no painel do Mercado Pago | AUD-015 | 30 min | webhook sem assinatura → 401 |

## CURTO — até 7 dias (antes de ativar a cobrança)

| # | Ação | Achado | Esforço | Teste de aceitação |
|---|---|---|---|---|
| 4 | `npm install sharp@^0.35.4 multer@latest -w server`; em `avatar.ts` conferir `metadata().format ∈ {jpeg,png,webp}` antes de processar; `limitInputPixels`; `limits.fields/parts` no multer | AUD-002 / AUD-016 | 1 h | AVIF com MIME `image/png` → 400; `npm audit --audit-level=high` limpo em sharp/multer |
| 5 | `app.set('trust proxy', 1)`; store compartilhado para express-rate-limit (Mongo/Redis); limite adicional por conta em login e request-code; `Retry-After` | AUD-003 | 3 h | XFF distintos não se somam; 10 falhas na mesma conta → 429 |
| 6 | `applyPaymentById` atômico (`findOneAndUpdate({providerPaymentId, appliedAt:null, status:'approved'}, {$set:{appliedAt}})`), validar `transaction_amount`/`currency_id`, tratar `refunded`/`charged_back`; rate limit em `/billing/confirm` e webhook | AUD-007 / AUD-015 | 3 h | dois confirms concorrentes → +30 dias uma vez; estorno reduz `paidUntil` |

## MÉDIO — até 30 dias

| # | Ação | Achado | Esforço | Teste de aceitação |
|---|---|---|---|---|
| 7 | `sessionVersion` no usuário e no JWT; incrementar em reset/troca de senha e "sair de todos"; `jwt.verify(..., {algorithms:['HS256']})`; validade 7 d → curta com renovação, ou inatividade 24 h | AUD-004 | 4 h | token anterior ao reset → 401 |
| 8 | Escapar regex e `max(100)` no `search` dos três controllers; `SyntaxError` → 400 | AUD-006 | 1 h | `?search=(` → 200/400, nunca 500 |
| 9 | MFA (TOTP/WebAuthn) para `ADMIN_EMAILS`; coleção `AuditLog` para ações admin; reautenticação antes de liberar contas | AUD-008 | 1–2 dias | ação admin gera registro; painel exige fator |
| 10 | Remover `avatarUrl` dos schemas de create/update; `deleteAvatar` só apaga URLs do próprio store/`localId`; `max()` em strings livres | AUD-009 | 1 h | PUT com avatarUrl externo → ignorado |
| 11 | `comparePassword` contra hash fictício quando o usuário não existe; decidir sobre a mensagem 409 do cadastro | AUD-010 | 30 min | tempos equivalentes |
| 12 | Bloco `headers` no `vercel.json` (CSP com hash do script inline ou script externo, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy) | AUD-011 | 2 h | `curl -I` na home mostra cabeçalhos; app sem erros de CSP |
| 13 | `min(8)`/`max(128)` + blocklist de senhas comuns (lista local ou HIBP k-anonymity) | AUD-014 | 2 h | `123456` → 400 |
| 14 | `npm audit --audit-level=high` no build; dependabot; remover `@capacitor/*` e `client/android` se o nativo não voltar | AUD-016 | 1 h | build falha com vulnerabilidade alta |
| 15 | Logger estruturado (pino) para eventos de segurança + log drain com retenção ≥ 90 dias + alertas básicos | AUD-017 | 1 dia | eventos visíveis no destino |
| 16 | Confirmar plano/backup do Atlas; em M0, `mongodump` agendado para storage privado e teste de restauração | AUD-018e | 2 h | restauração em cluster de teste bem-sucedida |

## ESTRATÉGICO — até 90 dias

| # | Ação | Achado | Esforço |
|---|---|---|---|
| 17 | Verificação de `Origin`/`Referer` nas mutações; cookie `__Host-token` em produção; exigir `Content-Type: application/json` | AUD-013 | 2 h |
| 18 | Origens de desenvolvimento no CORS apenas fora de produção | AUD-012 | 15 min |
| 19 | `token` no corpo do login só para o app nativo (ou remover); `.env.example` sem usuário/hosts reais; `entity.too.large` → 413; aviso sobre dispositivos compartilhados | AUD-018 | 1 h |
| 20 | SBOM (CycloneDX via `npm sbom`), plano de resposta a incidentes (rotação de `JWT_SECRET`, `MP_ACCESS_TOKEN`, `SMTP_PASS`), `security.txt` | — | 1 dia |

## Dependências entre itens

- 5 (trust proxy/limites) potencializa 11 e 13; sem 5, enumeração + senhas fracas continuam exploráveis.
- 7 (revogação) deve preceder qualquer rotação planejada de `JWT_SECRET`.
- 6 e 3 devem estar prontos antes de `MP_ACCESS_TOKEN` entrar em produção.

## Risco residual esperado após o roteiro

Sem falhas ALTAS conhecidas; residual MÉDIO em autenticação por fator único para usuários comuns (MFA opcional é uma evolução), e infraestrutura (Vercel/Atlas) dependente de configuração não auditável por código.
