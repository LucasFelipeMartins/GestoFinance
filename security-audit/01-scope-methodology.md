# 01 — Escopo, autorização e metodologia

## Ficha interna (preenchida pela auditoria)

| Campo | Valor | Origem |
|---|---|---|
| PROJECT_ROOT | `E:\Lucas\Projeto-Gestor` (workspace único) | OBSERVADO NO PROJETO |
| PROJECT_NAME | GestorFinance (antes GestorPro); repositório `LucasFelipeMartins/GestoFinance` (público) | OBSERVADO NO PROJETO |
| ALLOWED_TARGETS | Arquivos do workspace; servidor de desenvolvimento local `http://localhost:4000` (API) e `http://localhost:5173` (SPA) | INFORMADO PELO USUÁRIO (pedido de "verificações e testes") + padrão seguro |
| EXCLUDED_TARGETS | Site publicado na Vercel, painel do Atlas, Mercado Pago, provedores de e-mail, o app Flutter (`flutter_app/`, não implantado) e o projeto Android/Capacitor (descontinuado) | padrão do prompt |
| ENVIRONMENT | Código local; ambiente remoto não verificado. **Atenção:** o servidor local usa o mesmo banco MongoDB Atlas da produção (`server/.env`), por isso apenas a conta demo (dados de exemplo) e registros canário criados/removidos pela auditoria foram usados | OBSERVADO NO PROJETO |
| AUTHORIZATION_MODE | STATIC_ONLY estendido com testes locais seguros (sem exploração destrutiva, sem carga, sem e-mails, sem pagamentos) | INFERIDO do pedido; produção nunca acionada |
| AUTHORIZATION_REFERENCE | Pedido do responsável nesta sessão: "faça todas as verificações e testes de segurança do meu sistema" | INFORMADO PELO USUÁRIO |
| TEST_ACCOUNTS | `demo@gestorpro.com` (conta de exemplo do seed) e `audit-canary@example.com` (criada e apagada durante a auditoria); nenhuma senha reproduzida aqui | OBSERVADO |
| STACK_KNOWN | React 18 + Vite 7 + Tailwind + Dexie (IndexedDB) + React Query; Express 4 + Mongoose 8 + zod + jsonwebtoken + bcryptjs + helmet + express-rate-limit + multer + sharp + nodemailer + mercadopago; deploy Vercel (SPA estático + função Node em `api/index.ts`); MongoDB Atlas; Vercel Blob; Resend/SMTP; Mercado Pago Checkout Pro | OBSERVADO |
| SENSITIVE_DATA | Hipótese a partir dos schemas: nome/e-mail/hash de senha de usuários; nome, telefone, serviço, preço e foto de clientes finais; receitas, despesas, parcelas, investimentos e metas; ids de pagamento | INFERIDO |
| CRITICAL_FLOWS | Cadastro com código por e-mail; login; esqueci/redefinir/trocar senha; sincronização de dados (outbox); upload de avatar; assinatura (checkout, confirmação, webhook); painel admin de contas gratuitas | OBSERVADO |
| BUSINESS_IMPACT | Vazamento cross-usuário (fato: não encontrado); indisponibilidade; perda de receita da assinatura; tomada de contas | INFERIDO |
| APPLY_FIXES | false — somente relatório | padrão |
| REPORT_LANGUAGE | pt-BR | padrão |

## Registro de evidência (Fase 0)

- Data/hora: 2026-09-14T00:22Z (início) · Commit `903f44660ca29812abfca738e9681c89c2a68213` · branch `main` · worktree com 55 arquivos alterados (funcionalidades entregues nesta mesma sessão de trabalho: assinatura, ícone, PWA).
- Runtime: Node v24.18.0, npm 11.16.0 (Windows 11).
- Ferramentas já disponíveis: `npm audit` (consulta ao registro npm — apenas metadados de versões, sem envio de código), `git`, `curl`, `python`, Playwright-core + Chrome já instalados no scratchpad (usados só para gerar/verificar o PDF). **Não estavam instalados** e **não foram instalados**: Semgrep, CodeQL, Gitleaks, OSV-Scanner, Trivy, ZAP. A busca de segredos e o SAST foram manuais (grep dirigido + leitura de código).
- Diretório de resultados: `security-audit/` (sem `.env`, dumps, tokens ou dados de clientes). Evidência bruta dos testes locais: `security-audit/audit-evidence.txt` (valores de cookie redigidos).
- Limites dinâmicos: no máximo 22 requisições de login por teste; nenhuma requisição que gere e-mail (SMTP real está configurado no `.env` local) ou pagamento; nenhum padrão de ReDoS executado contra o banco compartilhado; contas/dados canário removidos ao final.

## Suposições

1. O responsável é o dono do projeto (confirmado pelo pedido) — mantida.
2. O banco usado pelo servidor local é o de produção — confirmado pela URL do cluster no `.env` (valor redigido) e pela presença dos dados de exemplo; por isso os testes foram restritos a leitura, à conta demo e a canários.
3. Em produção `NODE_ENV=production` (Vercel define por padrão) — não verificado; afeta `secure` do cookie, morgan e o ramo de `resolveAppUrl`.
4. Variáveis `APP_URL`, `MP_*`, `ADMIN_EMAILS`, `CLIENT_ORIGIN` de produção — desconhecidas.

## Normas e método

OWASP ASVS 5.0 (Level 2 como alvo; Level 3 sugerido para admin/pagamentos), OWASP Top 10:2025, OWASP API Security Top 10:2023, WSTG, CWE, NIST SP 800-63B-4 (senhas/recuperação), RFC 8725 (JWT). Identificadores ASVS citados apenas por capítulo/categoria: o texto exato dos requisitos não foi conferido contra a publicação — registrado como "referência exata não verificada". CVSS v4.0 calculado manualmente por achado (vetor no relatório). KEV/EPSS não consultados online (sem CVEs numerados nos avisos relevantes; GHSA indicados).

## Ordem executada (Fase 5)

1. Inventário read-only (rotas, modelos, validadores, configuração, deploy, dependências).
2. Revisão manual por domínio (A–P do prompt); Q (IA) e R (mobile/WebRTC) não aplicáveis — o app Flutter existe no repositório mas não é distribuído e não foi auditado.
3. `npm audit` + `npm ls` para alcance de dependências; busca de segredos no histórico Git.
4. Testes locais seguros T01–T15 (`audit-evidence.txt`): cabeçalhos, CORS, cookie, JWT `none`, injeção de regex, erros, enumeração, BOLA com canário, mass assignment, autorização admin, gate 402, webhook anônimo, rate limit atrás de proxy, tempo de resposta, limites de corpo.
5. Triagem de falsos positivos, correlação (cadeias) e redação em duas camadas.
