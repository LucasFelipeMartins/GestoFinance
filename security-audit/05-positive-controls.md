# 05 — Controles positivos comprovados

Somente controles com evidência de teste ou de código. "Não encontrei" não foi tratado como aprovação.

| ID | Controle | Evidência | Alcance |
|---|---|---|---|
| AUD-CV-01 | Isolamento por usuário em todos os dados (BOLA/IDOR ausente) | Teste T08: usuário canário tentou GET/PUT/DELETE de cliente de outro usuário → 404 em todos; lista do canário vazia; anônimo → 401. Código: todas as consultas de clients/tasks/finance/goals incluem `userId: req.userId` (grep verificado). | Alto — cobre leitura, escrita, exclusão e listagem. |
| AUD-CV-02 | Autenticação obrigatória e JWT `alg: none` rejeitado | T04: token com alg=none → 401. requireAuth exige cookie ou Bearer válido. | Alto |
| AUD-CV-03 | Cookie de sessão HttpOnly + SameSite=Lax (+ Secure em produção pelo código) | T03: Set-Cookie com HttpOnly; SameSite=Lax; `secure: env.isProduction` em setAuthCookie. | Médio — ver AUD-013 (única camada CSRF). |
| AUD-CV-04 | Hash de senha com bcrypt custo 12 | server/src/utils/password.ts; T13 mostra ~280 ms por comparação. | Alto |
| AUD-CV-05 | Tokens de recuperação e códigos de cadastro: aleatórios, armazenados como HMAC, uso único, expiração curta, tentativas limitadas, cooldown | services/verification.ts; T07 comportamento de cooldown observado em sessão anterior (429 'Aguarde 60s'). | Alto |
| AUD-CV-06 | Resposta uniforme no 'esqueci minha senha' | forgotPassword devolve a mesma mensagem existindo ou não a conta (código). | Alto |
| AUD-CV-07 | Validação de entrada com zod em todas as rotas (tipos estritos impedem injeção NoSQL por objetos) | Validators por módulo; `mongoose.set('strictQuery', true)`; e-mails validados com `.email()`. | Alto (exceto regex de busca — AUD-006) |
| AUD-CV-08 | Erros genéricos sem stack trace; JSON malformado → 400 | T06. | Alto |
| AUD-CV-09 | Nenhum segredo no histórico do Git | Busca por padrões (mongodb://user:pass@, JWT_SECRET=valor, APP_USR-, re_…, SMTP_PASS=valor, chaves privadas) em `git log --all -p`: apenas placeholders em .env.example/README. `.env` ignorado (git check-ignore). | Médio — busca por padrões, não exaustiva. |
| AUD-CV-10 | Frontend sem sinks perigosos e sem source maps publicados | grep: nenhum dangerouslySetInnerHTML/innerHTML/eval; dist sem .map; nenhum token em localStorage no web. | Alto |
| AUD-CV-11 | helmet ativo na API (CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy) | T01. | Médio — não cobre o SPA (AUD-011). |
| AUD-CV-12 | CORS rejeita origens desconhecidas | T02: `Origin: https://evil.example` → sem cabeçalhos ACAO. | Alto (ressalva AUD-012) |
| AUD-CV-13 | Autorização de função administrativa no servidor | T09: usuário comum → 403 em /api/admin/free-accounts. | Alto |
| AUD-CV-14 | Bloqueio de plano no servidor (402) e não só na interface | T10: canário com teste expirado → 402 em /api/clients; /billing/status reporta `allowed: false`. | Alto |
| AUD-CV-15 | Pagamento: preço definido no servidor, idempotência por id do pagamento e vínculo ao usuário via external_reference; corpo do webhook nunca é confiado | billing.ts createCheckout/applyPaymentById; confirm verifica `result.userId !== String(user._id)` → 403. | Médio — ver AUD-007. |
| AUD-CV-16 | Imagens de avatar reprocessadas (resize + WebP) — SVG/HTML/polyglots não são servidos como enviados | utils/avatar.ts processAvatar; nome de arquivo gerado pelo servidor; `path.basename` na remoção local. | Médio — ver AUD-002. |
| AUD-CV-17 | E-mails com escape de HTML nos campos do usuário | services/mail.ts escapeHtml aplicado a nome e link. | Alto |
| AUD-CV-18 | Limite de corpo JSON (100 kB padrão do express.json) e limite de tamanho de upload (5 MB) | T14 (rejeitado, embora com 500); uploadAvatar.ts limits.fileSize. | Médio |
