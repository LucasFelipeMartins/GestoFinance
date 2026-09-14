# 04 — Achados

Ordenados por severidade. Cada achado tem duas camadas: explicação didática e detalhes técnicos. Evidências brutas em `audit-evidence.txt` (T01–T15).

## AUD-001 — Conta de demonstração com senha pública no repositório e ativa no banco de produção

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** ALTA
- **CVSS v4.0:** 7.1 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-798 Uso de credenciais embutidas; CWE-1392 Credenciais padrão · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API2:2023 Broken Authentication · **ASVS:** V6 Authentication (credenciais padrão/conhecidas) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável (sem CVE)
- **Onde está:** server/src/seed.ts:12-13 (DEMO_EMAIL / DEMO_PASSWORD); banco `gestor` no Atlas; repositório público em github.com/LucasFelipeMartins/GestoFinance
- **Owner / prazo / esforço:** Dono do produto (Lucas) · URGENTE, 24–48h · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** O script de carga de exemplo grava no código a conta demo@gestorpro.com com senha fixa; o repositório é público (HTTP 200 sem login) e essa conta existe e aceita login no banco de produção usado pelo site.

**Como deveria funcionar.** Contas de demonstração devem existir apenas em bancos de teste, com senha gerada na hora e nunca escrita no código. Se um dado de exemplo precisar ir para produção, ele deve ser removido antes de abrir o sistema ao público.

**O que está acontecendo.** Durante os testes locais o servidor de desenvolvimento (ligado ao mesmo banco Atlas da produção) devolveu HTTP 200 para POST /api/auth/login com as credenciais que estão em seed.ts. O repositório GitHub responde 200 para visitantes anônimos, então a senha é pública.

**Por que isso é uma brecha.** Autenticação existe para provar quem está pedindo. Uma senha que qualquer pessoa pode ler no GitHub não prova nada: qualquer visitante vira usuário autenticado do sistema real sem criar conta, sem confirmar e-mail e sem passar pela assinatura. Toda proteção que exige 'estar logado' (upload de imagem, buscas, criação de registros) deixa de ser barreira para quem usa essa conta.

**Sequência causal.** Senha em código público → conta correspondente presente no banco de produção → POST /api/auth/login aceita → sessão válida de 7 dias emitida → acesso a todos os endpoints autenticados e ao plano sem pagar.

**Como alguém poderia abusar.** Alguém lê seed.ts no GitHub, entra no site publicado com demo@gestorpro.com e a senha do arquivo, e passa a usar o produto gratuitamente ou a explorar falhas que exigem login (AUD-002, AUD-006) sem deixar rastro ligado a uma identidade real. Vários atacantes compartilhando a mesma conta também podem apagar dados uns dos outros nela.

**O que foi demonstrado.** Login bem-sucedido (200) em localhost contra o banco de produção com as credenciais do arquivo; repositório público confirmado.

**O que pode acontecer.** Uso gratuito do SaaS; base autenticada para outros ataques; alteração/remoção dos dados de exemplo; reputação. Não há acesso a dados de outras contas por esse caminho (escopo por usuário validado em AUD-CV-01).

**Por que recebeu este nível.** ALTA e não CRÍTICA: a conta é comum (não administrador) e o isolamento por usuário impede alcançar dados de terceiros. É mais que MÉDIA porque remove completamente a barreira de autenticação em produção para qualquer pessoa, sem interação da vítima.

**O que faria o nível subir ou descer.** Sobe para CRÍTICA se o e-mail demo for colocado em ADMIN_EMAILS ou se surgir uma falha explorável apenas autenticada com impacto amplo. Desce para BAIXA se a conta for removida de produção ou o repositório ficar privado com a senha trocada.

**Como corrigir.** 1) Apagar o usuário demo do banco de produção (ou trocar a senha para uma gerada e não publicada). 2) Em seed.ts, recusar execução quando NODE_ENV=production e gerar senha aleatória impressa apenas no console. 3) Avaliar tornar o repositório privado ou, se ficar público, garantir que nada nele funcione em produção. 4) Considerar exigir troca de senha no primeiro login para contas provisionadas.

**Como confirmar a correção.** 1) POST /api/auth/login com demo@gestorpro.com/senha do arquivo em produção → 401. 2) `NODE_ENV=production npm run seed` → aborta com mensagem. 3) Busca no repositório pela senha antiga do seed → nenhum resultado.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** T03/T08 em audit-evidence: `POST /api/auth/login` → 200 e Set-Cookie (valor redigido). `curl -s -o /dev/null -w '%{http_code}' https://github.com/LucasFelipeMartins/GestoFinance` → 200.

**Risco residual:** Contas de teste criadas manualmente continuam sendo risco se tiverem senhas fracas; revisar periodicamente usuários sem atividade.

---

## AUD-002 — Upload de avatar alcança decodificadores de imagem vulneráveis (sharp/libheif) e multer com falhas de DoS

- **Status:** PROVÁVEL · **Confiança:** média · **Severidade:** ALTA
- **CVSS v4.0:** 7.5 — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N`
- **CWE:** CWE-1395 Dependência com vulnerabilidade conhecida; CWE-122 Heap overflow (libheif); CWE-400 Consumo descontrolado de recursos (multer) · **OWASP Top 10:2025:** A03:2025 Software Supply Chain Failures · **API Top 10:2023:** API8:2023 Security Misconfiguration · **ASVS:** V5 File Handling / V15 Secure Coding — referência exata não verificada
- **CISA KEV / EPSS:** não consultado (advisories GitHub: GHSA-rgj7-g3m4-5g8c, GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf, GHSA-535w-7cp7-47q4)
- **Onde está:** server/src/middleware/uploadAvatar.ts:6-18 (fileFilter por MIME declarado); server/src/utils/avatar.ts:9-11 (sharp(buffer) decodifica pelo conteúdo); package-lock: sharp 0.35.3, multer 2.2.0
- **Owner / prazo / esforço:** Desenvolvimento · CURTO, até 7 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Qualquer usuário logado pode enviar um arquivo em POST /api/clients/:id/avatar; o filtro só confere o tipo que o navegador declara, e a biblioteca sharp decide o formato pelo conteúdo real — inclusive HEIF/AVIF, cujo decodificador (libheif) tem falhas de corrupção de memória corrigidas em sharp 0.35.4. O multer instalado (2.2.0) tem três avisos de negação de serviço por campos multipart maliciosos.

**Como deveria funcionar.** Arquivos vindos do usuário devem ser decodificados apenas nos formatos que o produto aceita (JPG, PNG, WebP), por uma biblioteca atualizada, com limites de pixels, dentro de um processo isolado; o formato deve ser conferido pelos primeiros bytes, não pelo cabeçalho enviado pelo cliente.

**O que está acontecendo.** `ALLOWED_MIME_TYPES` compara `file.mimetype` (controlado pelo cliente). `sharp(buffer).resize(...)` não restringe formato de entrada; o binário pré-compilado presente suporta entrada HEIF (`sharp.format.heif.input.buffer === true`, verificado). `npm audit` lista sharp <0.35.4 (libheif) e multer ≤2.2.0 (DoS).

**Por que isso é uma brecha.** Um arquivo que se declara `image/png` mas contém um HEIF malicioso passa pelo filtro e chega ao decodificador vulnerável. Em uma função serverless, uma falha de memória derruba a execução (negação de serviço) e, em cenários de heap overflow, pode permitir execução de código no ambiente que guarda MONGO_URL, JWT_SECRET e o token do Mercado Pago. O multer, por sua vez, pode ser travado com nomes de campo especialmente montados antes mesmo de a imagem ser processada.

**Sequência causal.** Usuário autenticado (ou AUD-001) → multipart com MIME falso e conteúdo HEIF/AVIF ou campos malformados → fileFilter aceita → sharp/libheif decodifica → corrupção de memória ou esgotamento de recursos → indisponibilidade ou, potencialmente, execução de código com acesso aos segredos do servidor.

**Como alguém poderia abusar.** Uma conta comum (ou a demo pública) envia repetidamente um AVIF/HEIF malformado como avatar de um cliente próprio; a função da Vercel falha a cada tentativa e o serviço fica instável para todos; em versão explorável da libheif o invasor tenta obter execução remota.

**O que foi demonstrado.** Alcance confirmado: filtro por MIME declarado e suporte HEIF no binário instalado. A exploração (arquivo malicioso) NÃO foi executada — não é um teste seguro sem ambiente isolado.

**O que pode acontecer.** Indisponibilidade da API para todos os usuários; comprometimento do ambiente serverless e dos segredos (banco, JWT, pagamentos) em caso de exploração bem-sucedida da corrupção de memória.

**Por que recebeu este nível.** ALTA: pré-condição real (conta autenticada, hoje trivial por AUD-001), correção simples, impacto potencial de DoS confirmado pelos avisos e possibilidade de RCE não demonstrada. Não é CRÍTICA porque a execução de código não foi comprovada nem há PoC pública verificada para este uso.

**O que faria o nível subir ou descer.** Sobe para CRÍTICA se existir exploit público confiável para a versão instalada ou se o upload ficar disponível sem login. Desce para MÉDIA após atualizar sharp/multer e restringir formatos de entrada.

**Como corrigir.** 1) `npm install sharp@^0.35.4 multer@latest -w server` e reexecutar `npm audit`. 2) Antes de processar, conferir o formato real: `const meta = await sharp(buffer, { limitInputPixels: 24_000_000 }).metadata(); if (!['jpeg','png','webp'].includes(meta.format)) rejeitar`. 3) Manter `limits.fileSize`, adicionar `limits.fields/parts` no multer. 4) Executar `npm audit` no pipeline de deploy (Vercel Build) e falhar em vulnerabilidades altas alcançáveis.

**Como confirmar a correção.** 1) Upload de PNG válido → 200 e avatar WebP salvo. 2) Upload de AVIF/HEIF com MIME `image/png` → 400 'Formato não suportado'. 3) Upload de SVG/HTML → 400. 4) `npm audit --audit-level=high` sem itens em sharp/multer.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** `npm audit --json` (sharp <0.35.4, multer ≤2.2.0, cvss 7.5 nos avisos multer); `node -e "require('sharp').format.heif.input"` → `{file:true,buffer:true,stream:true}`; uploadAvatar.ts linhas 6-18.

**Risco residual:** Decodificadores JPEG/PNG/WebP também recebem correções periódicas; manter rotina de atualização mensal.

---

## AUD-003 — Limite de tentativas de login inoperante atrás do proxy: todos os visitantes compartilham um único contador e cada instância serverless tem o seu

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** MÉDIA
- **CVSS v4.0:** 6.3 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:L/SC:N/SI:N/SA:N`
- **CWE:** CWE-307 Restrição inadequada de tentativas de autenticação; CWE-348 Uso de fonte menos confiável para o IP · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API4:2023 Unrestricted Resource Consumption · **ASVS:** V6 Authentication (anti-automação) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/app.ts (sem `app.set('trust proxy', …)`); server/src/routes/auth.routes.ts:18-35 (express-rate-limit com store em memória, 20/15min por `req.ip`)
- **Owner / prazo / esforço:** Desenvolvimento · CURTO, até 7 dias · médio

### Camada 1 — Entenda a brecha

**O que encontramos.** O limitador de tentativas usa o endereço IP que o Express enxerga. Na Vercel, as requisições chegam por um proxy; sem `trust proxy`, o Express vê sempre o IP do proxy, então todos os usuários caem no mesmo balde de 20 tentativas por 15 minutos. Além disso o contador vive na memória de cada instância serverless, que nasce e morre a todo momento.

**Como deveria funcionar.** Cada cliente deve ter seu próprio limite (por IP real e por conta), guardado em um lugar compartilhado entre instâncias (banco ou Redis), com bloqueio progressivo por conta após várias falhas.

**O que está acontecendo.** Teste T12: 22 logins errados enviados com cabeçalhos X-Forwarded-For diferentes (simulando 22 visitantes) — o servidor devolveu 401 até a 18ª e 429 a partir daí, provando que ignora o cabeçalho e agrupa todos em um só contador. O código não define `trust proxy`.

**Por que isso é uma brecha.** Dois efeitos opostos e ambos ruins: (1) um atacante que acerta uma instância nova ou espera o reinício tem 20 tentativas por instância, e como a Vercel abre várias instâncias em paralelo o limite real é multiplicado; (2) 20 erros de senha de quaisquer pessoas no mundo bloqueiam o login de todos os clientes daquela instância por 15 minutos — um usuário mal-intencionado pode negar o login a todo mundo com 20 requisições. O mesmo vale para o envio de códigos de cadastro (6/15min), que passa a ser um limite global: bastam 6 cadastros legítimos para o 7º ser recusado.

**Sequência causal.** Requisição via proxy → `req.ip` = IP do proxy (trust proxy desligado) → chave do rate limit igual para todos → contador por instância em memória → (a) força bruta distribuída entre instâncias; (b) 429 para usuários legítimos após 20 falhas alheias.

**Como alguém poderia abusar.** Alguém envia 20 senhas erradas para qualquer e-mail: clientes reais recebem 'Muitas tentativas' por 15 minutos naquela instância. Ou tenta senhas comuns contra um e-mail conhecido, repetindo a cada nova instância/janela sem bloqueio por conta.

**O que foi demonstrado.** Compartilhamento do contador entre 'IPs' diferentes (T12) e ausência de bloqueio por conta.

**O que pode acontecer.** Comprometimento de contas com senhas fracas (mínimo de 6 caracteres, AUD-014); indisponibilidade do login/cadastro para clientes legítimos; abuso do envio de e-mails.

**Por que recebeu este nível.** MÉDIA: impacto real (takeover de senhas fracas, DoS de login) mas exige volume e é limitado pelo bcrypt (≈280 ms por tentativa) e pela ausência de enumeração fácil de senhas. Não é ALTA porque não há bypass de autenticação direto.

**O que faria o nível subir ou descer.** Sobe para ALTA se combinada com senhas fracas conhecidas ou lista de e-mails vazada. Desce para BAIXA com limite por conta + store compartilhado + bloqueio progressivo.

**Como corrigir.** 1) `app.set('trust proxy', 1)` (Vercel coloca o IP real em X-Forwarded-For) e validar `req.ip` no log. 2) Store compartilhado: `rate-limit-mongo` ou coleção própria com TTL, já que o projeto tem Mongo. 3) Limite adicional por conta (e-mail) em login e request-code, com backoff exponencial e alerta ao titular após N falhas. 4) Devolver `Retry-After`. 5) Considerar desafio (CAPTCHA) apenas após falhas repetidas por conta.

**Como confirmar a correção.** 1) 21 tentativas com o mesmo XFF → 429 na 21ª; 2) tentativas com XFF diferentes → não se somam; 3) reiniciar o servidor não zera o contador (store compartilhado); 4) 10 falhas na mesma conta → 429 mesmo com IPs diferentes.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T12: sequência '401×18, 429×4' com X-Forwarded-For distintos. Código: ausência de `trust proxy`; `rateLimit({ windowMs: 15*60*1000, limit: 20 })` sem `store`.

**Risco residual:** Ataques distribuídos de baixa velocidade continuam possíveis; MFA (AUD-008) e senhas fortes (AUD-014) reduzem o impacto.

---

## AUD-004 — Sessões (JWT de 7 dias) não podem ser revogadas: trocar/redefinir a senha ou sair não invalida tokens já emitidos

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** MÉDIA
- **CVSS v4.0:** 5.9 — `CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-613 Expiração de sessão insuficiente; CWE-287 · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API2:2023 Broken Authentication · **ASVS:** V7 Session Management (invalidação/expiração) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/utils/jwt.ts (HS256, expiresIn 7d, sem `jti`/versão); server/src/middleware/requireAuth.ts:26-38 (verifica só assinatura/expiração); server/src/controllers/auth.controller.ts (resetPassword/changePassword só rehash da senha; logout só limpa cookie)
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · médio

### Camada 1 — Entenda a brecha

**O que encontramos.** O login gera um token assinado que vale 7 dias e o servidor só confere a assinatura e a validade. Não existe lista de sessões, versão de senha no token nem expiração por inatividade. Logout apaga o cookie do navegador, mas o token continua aceito se alguém o tiver copiado.

**Como deveria funcionar.** Quando a senha muda (troca voluntária ou 'esqueci minha senha'), todas as sessões anteriores devem parar de valer; sair deve invalidar a sessão no servidor; sessões longas devem exigir atividade recente.

**O que está acontecendo.** `verifyToken` apenas `jwt.verify(token, secret)`; nenhum campo do usuário (ex.: `passwordChangedAt`, `sessionVersion`) é comparado. `resetPassword` faz `res.clearCookie` (só no navegador que pediu) e não altera nada que invalide outros tokens.

**Por que isso é uma brecha.** O cenário-alvo de 'esqueci minha senha' é justamente quando a pessoa suspeita que outra pessoa está usando sua conta. Aqui, após redefinir a senha, o invasor com o token antigo (cookie roubado, dispositivo compartilhado, app no celular perdido) continua dentro por até 7 dias. Como o token está em cookie HttpOnly no web, o roubo exige acesso ao dispositivo ou ao tráfego, o que limita — mas não elimina — o risco.

**Sequência causal.** Token emitido (7d) → cópia obtida por terceiro (dispositivo compartilhado/perdido, malware) → titular redefine senha → servidor não relaciona senha a tokens → token antigo segue válido até expirar.

**Como alguém poderia abusar.** A pessoa usa o app em um computador de terceiros e esquece de sair; ao perceber, troca a senha do celular. O terceiro continua com acesso completo por até uma semana.

**O que foi demonstrado.** Por leitura de código (não foi necessário teste dinâmico: não existe caminho de invalidação).

**O que pode acontecer.** Permanência de invasor após recuperação da conta; impossibilidade de encerrar sessões em incidente (ex.: vazamento do JWT_SECRET exigiria rotacionar a chave e deslogar todo mundo).

**Por que recebeu este nível.** MÉDIA: exige que o token já tenha sido obtido; impacto limitado à conta afetada, mas anula a principal defesa do usuário (trocar senha).

**O que faria o nível subir ou descer.** Sobe para ALTA se o token passar a ser guardado em localStorage ou exposto em logs/URLs. Desce para BAIXA com versão de sessão + expiração curta com renovação.

**Como corrigir.** 1) Adicionar `sessionVersion` (ou `passwordChangedAt`) ao usuário, incluir no payload do JWT e rejeitar em requireAuth quando divergir; incrementar em reset/troca de senha e em 'sair de todos os dispositivos'. 2) Reduzir a validade para ~1h com renovação silenciosa via refresh token rotativo em cookie, ou manter 7d absoluto + 24h de inatividade. 3) Registrar `iss`/`aud` e validar em `jwt.verify` com `algorithms: ['HS256']`. 4) Ao rotacionar JWT_SECRET, aceitar a chave antiga por um curto período ou forçar novo login com aviso.

**Como confirmar a correção.** 1) Login → token A; redefinir senha → GET /api/auth/me com token A → 401. 2) Logout → token → 401. 3) Token com `alg: HS512` assinado com a mesma chave → 401 (algoritmo restrito).

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** jwt.ts e requireAuth.ts citados; auth.controller.ts resetPassword linhas 'user.passwordHash = …; res.clearCookie'.

**Risco residual:** Tokens roubados valem até a próxima invalidação; sem MFA o reset por e-mail continua sendo o fator único.

---

## AUD-005 — Link de redefinição de senha montado a partir dos cabeçalhos Origin/Host da requisição (envenenamento de link)

- **Status:** PROVÁVEL · **Confiança:** média · **Severidade:** MÉDIA
- **CVSS v4.0:** 5.3 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:P/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-640 Mecanismo fraco de recuperação de senha; CWE-20 · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API8:2023 Security Misconfiguration · **ASVS:** V6 Authentication (recuperação) / V13 Configuration — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/utils/appUrl.ts:10-27 (resolveAppUrl); server/src/controllers/auth.controller.ts forgotPassword (`${resolveAppUrl(req)}/redefinir-senha?token=…`); APP_URL opcional em .env.example
- **Owner / prazo / esforço:** Desenvolvimento / Deploy · CURTO, até 7 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Quando APP_URL não está definido, o endereço usado no e-mail de 'esqueci minha senha' é calculado a partir do que a requisição informa: Origin (se igual a https://<Host>) ou, em último caso, o próprio Host. Esses cabeçalhos são controlados por quem faz a requisição.

**Como deveria funcionar.** Links enviados por e-mail devem usar um endereço fixo e confiável configurado no servidor, nunca derivado da requisição.

**O que está acontecendo.** `if (origin && !isLocalOrigin && (sameOrigin || env.clientOrigins.includes(origin))) return origin;` com `sameOrigin = origin === https://${host}` — ambos vindos do cliente. Em desenvolvimento qualquer Origin é aceito. Mitigação parcial: a borda da Vercel só encaminha requisições cujo Host pertença ao projeto, o que reduz o ataque em produção; não foi possível verificar outros cabeçalhos (X-Forwarded-Host) nem a lista CLIENT_ORIGIN efetiva.

**Por que isso é uma brecha.** 'Envenenamento de link de reset' é quando o atacante pede a redefinição em nome da vítima, mas com um cabeçalho Host/Origin apontando para um domínio dele; o e-mail legítimo chega à vítima com um link para o site do atacante contendo o token; ao clicar, o token é entregue ao atacante, que redefine a senha. A defesa correta é ignorar cabeçalhos e usar APP_URL.

**Sequência causal.** POST /api/auth/forgot-password com Host/Origin do atacante → resolveAppUrl devolve domínio do atacante → e-mail à vítima com link envenenado → vítima clica → token de reset no servidor do atacante → POST /reset-password pelo atacante → conta tomada.

**Como alguém poderia abusar.** Atacante conhece o e-mail da vítima; envia o pedido de reset com cabeçalhos manipulados; a vítima recebe um e-mail idêntico ao real (mesmo remetente e visual) e clica.

**O que foi demonstrado.** Somente leitura de código; não foi enviado e-mail em teste (custo/ruído e servidor local com SMTP real configurado).

**O que pode acontecer.** Tomada de conta de qualquer usuário cujo e-mail seja conhecido, condicionada a a borda aceitar o Host forjado e ao clique da vítima.

**Por que recebeu este nível.** MÉDIA: exige interação da vítima e depende de a infraestrutura encaminhar o Host manipulado (na Vercel isso provavelmente não ocorre, o que sustenta PROVÁVEL e não CONFIRMADO). O impacto seria alto (tomada de conta).

**O que faria o nível subir ou descer.** Sobe para ALTA se um domínio próprio com wildcard/CNAME aceitar hosts arbitrários ou se X-Forwarded-Host passar a ser usado. Desce para INFORMATIVA ao fixar APP_URL.

**Como corrigir.** 1) Definir APP_URL em produção e tornar obrigatório quando NODE_ENV=production (falhar no boot se ausente). 2) Remover o ramo que aceita `origin` genérico; manter apenas allowlist estrita (CLIENT_ORIGIN) e nunca o Host. 3) Manter o token de reset fora de logs (já em query, considerar POST ou `history.replaceState` na página).

**Como confirmar a correção.** 1) Pedido de reset com `Host: evil.example`/`Origin: https://evil.example` → link no e-mail (ou devLink) começa com APP_URL. 2) Boot em produção sem APP_URL → erro claro.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** appUrl.ts (trecho citado); README lista APP_URL como opcional.

**Risco residual:** Nenhum relevante após fixar a URL.

---

## AUD-006 — Texto de busca vira expressão regular sem escape nem limite (erro 500 e risco de lentidão no banco)

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** MÉDIA
- **CVSS v4.0:** 5.3 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N`
- **CWE:** CWE-1333 Complexidade ineficiente de regex (ReDoS); CWE-20 Validação de entrada imprópria · **OWASP Top 10:2025:** A05:2025 Injection · **API Top 10:2023:** API4:2023 Unrestricted Resource Consumption · **ASVS:** V2 Validation / V4 API — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/controllers/client.controller.ts:23; task.controller.ts:67; finance.controller.ts:70 (`new RegExp(query.search.trim(), 'i')`); validators `search: z.string().trim().optional()` sem tamanho máximo
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** O que o usuário digita na busca é usado diretamente como expressão regular na consulta ao MongoDB, sem escapar caracteres especiais nem limitar o tamanho.

**Como deveria funcionar.** Buscas de texto livre devem escapar os caracteres de regex (ou usar índice de texto), limitar o comprimento (ex.: 100 caracteres) e responder 400 para entradas inválidas.

**O que está acontecendo.** T05: `GET /api/clients?search=(` → 500 'Erro interno' (regex inválida lança exceção). T15: busca com 5.000 caracteres aceita (200). `search=.*` funciona como curinga. Os resultados continuam restritos ao próprio usuário (filtro `userId` é AND com o `$or`), então não há vazamento de dados.

**Por que isso é uma brecha.** Uma regex com repetições aninhadas pode obrigar o banco a testar bilhões de combinações por documento ('ReDoS'); como a consulta roda no cluster Atlas compartilhado por todos os usuários, um único cliente autenticado pode degradar o serviço para os demais. O erro 500 mostra falta de validação e polui os logs.

**Sequência causal.** Parâmetro `search` do cliente → `new RegExp(...)` sem escape/limite → `$or` de regex no MongoDB → padrão patológico avaliado em todos os documentos do usuário → CPU do banco consumida / exceção 500.

**Como alguém poderia abusar.** Usuário logado (ou a conta demo pública) faz várias requisições com um padrão como `(a+)+$` seguido de texto longo contra suas próprias listas; o banco fica lento para todos.

**O que foi demonstrado.** 500 com `(`; aceitação de 5.000 caracteres. O padrão de ReDoS NÃO foi executado contra o Atlas por ser um teste potencialmente danoso ao ambiente compartilhado (HIPÓTESE quanto ao tempo de execução real).

**O que pode acontecer.** Degradação/indisponibilidade do banco compartilhado; custos no Atlas.

**Por que recebeu este nível.** MÉDIA: precisa de conta autenticada e o dano é de disponibilidade; sem vazamento. Não BAIXA porque o vetor é trivial e atinge um recurso compartilhado.

**O que faria o nível subir ou descer.** Sobe para ALTA se um teste em ambiente isolado demonstrar segundos de CPU por requisição. Desce para BAIXA com escape + limite.

**Como corrigir.** 1) Escapar: `const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` antes de `new RegExp`. 2) `search: z.string().trim().max(100)`. 3) Preferir `$regex` com prefixo/índice ou Atlas Search para bases maiores. 4) Mapear `SyntaxError` para 400.

**Como confirmar a correção.** 1) `?search=(` → 200 lista vazia (ou 400), nunca 500. 2) `?search=` com 101 caracteres → 400. 3) Busca por 'a.b' encontra apenas texto literal 'a.b'.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T05 e T15.

**Risco residual:** Nenhum relevante.

---

## AUD-007 — Aplicação de pagamento não é atômica (pode creditar 30 dias duas vezes) e não valida valor/moeda nem estornos

- **Status:** PROVÁVEL · **Confiança:** média · **Severidade:** MÉDIA
- **CVSS v4.0:** 4.8 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:L/UI:N/VC:N/VI:L/VA:N/SC:N/SI:L/SA:N`
- **CWE:** CWE-362 Condição de corrida (TOCTOU); CWE-841 Aplicação imprópria de fluxo de negócio · **OWASP Top 10:2025:** A06:2025 Insecure Design · **API Top 10:2023:** API6:2023 Unrestricted Access to Sensitive Business Flows · **ASVS:** V2 Business Logic — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/services/billing.ts applyPaymentById (findOneAndUpdate → `if (status !== 'approved' || record.appliedAt) return` → `user.save()` → `record.save()`)
- **Owner / prazo / esforço:** Desenvolvimento · CURTO, até 7 dias (antes de ativar a cobrança) · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Quando um pagamento é confirmado, o servidor verifica se ele já foi aplicado e só depois grava; entre a verificação e a gravação, uma segunda chamada (webhook + retorno da página de pagamento ao mesmo tempo, ou duas abas) pode passar pela mesma verificação e somar 30 dias mais uma vez. O código também não confere se o valor pago corresponde ao preço nem trata pagamentos estornados ou contestados depois de aprovados.

**Como deveria funcionar.** Créditos de assinatura devem ser aplicados com uma operação atômica no banco (marcar como aplicado e só então creditar, uma única vez), validar `transaction_amount`/`currency_id` contra o preço configurado e reverter o acesso em `refunded`/`charged_back`.

**O que está acontecendo.** Há dois caminhos que chamam `applyPaymentById` (webhook e POST /billing/confirm) sem lock; a idempotência depende de `record.appliedAt` lido antes da escrita. Não há verificação de `transaction_amount` nem tratamento de status pós-aprovação.

**Por que isso é uma brecha.** 'Race condition' é quando duas execuções simultâneas leem o mesmo estado antes que qualquer uma o altere. Aqui o usuário controla o momento de chamar /billing/confirm e o Mercado Pago o momento do webhook; disparando ambos ao mesmo tempo (ou dois confirms em paralelo), um pagamento de R$ 11,90 pode virar 60 dias. Estornos não reduzirem o acesso significa que um cartão contestado mantém o serviço ativo.

**Sequência causal.** Pagamento aprovado → duas requisições concorrentes chamam applyPaymentById → ambas leem `appliedAt` vazio → ambas somam 30 dias em `paidUntil` → 60 dias por um pagamento.

**Como alguém poderia abusar.** Após pagar, o usuário dispara 5 requisições simultâneas a POST /api/billing/confirm com o mesmo payment_id; conforme o timing, obtém meses extras.

**O que foi demonstrado.** Somente por análise de código: exigiria pagamento real/credenciais do Mercado Pago para um teste dinâmico.

**O que pode acontecer.** Perda de receita (dias gratuitos indevidos); acesso mantido após estorno.

**Por que recebeu este nível.** MÉDIA: impacto financeiro limitado por usuário e exige timing; não afeta dados de terceiros.

**O que faria o nível subir ou descer.** Sobe se o preço passar a variar por plano (valor não validado) ou se surgirem preferências criadas fora do servidor. Desce para BAIXA com update atômico.

**Como corrigir.** 1) Aplicar de forma atômica: `Payment.findOneAndUpdate({ providerPaymentId, appliedAt: null, status: 'approved' }, { $set: { appliedAt: now } })` e só creditar se o documento retornado existir. 2) Validar `payment.transaction_amount >= priceMonthly` e `currency_id === 'BRL'`; registrar divergências. 3) Tratar `refunded`, `charged_back` e `cancelled` após aplicado: reduzir `paidUntil` pelo período creditado. 4) Rate limit em /billing/confirm e /billing/webhook.

**Como confirmar a correção.** 1) Dois `confirm` concorrentes com o mesmo id (mock do SDK) → `paidUntil` avança 30 dias uma única vez. 2) Pagamento aprovado com valor menor que o preço → não aplicado e logado. 3) Evento `refunded` → `paidUntil` recua.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** billing.ts, função applyPaymentById (linhas do bloco `if (status !== 'approved' || record.appliedAt) return …` até `record.save()`).

**Risco residual:** Fraude de cartão continua possível como em qualquer checkout; monitorar chargebacks no painel do Mercado Pago.

---

## AUD-008 — Administrador protegido apenas por senha (sem MFA) e sem trilha de auditoria

- **Status:** HIPÓTESE · **Confiança:** alta (o desenho está claro no código; a exploração depende de comprometer a senha) · **Severidade:** MÉDIA
- **CVSS v4.0:** 5.1 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:L/VA:N/SC:L/SI:L/SA:N`
- **CWE:** CWE-308 Uso de autenticação de fator único; CWE-778 Registro insuficiente · **OWASP Top 10:2025:** A07:2025 Authentication Failures; A09:2025 Security Logging and Alerting Failures · **API Top 10:2023:** API5:2023 Broken Function Level Authorization (contexto) · **ASVS:** V6 (MFA para funções administrativas) / V16 Logging — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/controllers/admin.controller.ts (requireAdmin por e-mail em ADMIN_EMAILS); server/src/config/env.ts adminEmails; ausência de log em addFreeAccount/removeFreeAccount
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · médio

### Camada 1 — Entenda a brecha

**O que encontramos.** Quem estiver na lista ADMIN_EMAILS pode liberar acesso gratuito a qualquer e-mail. Esse poder depende só da senha da conta (mínimo 6 caracteres) e de uma sessão de 7 dias; não há segundo fator nem registro de quem liberou o quê.

**Como deveria funcionar.** Funções administrativas de um SaaS devem exigir MFA (idealmente passkey/FIDO2), sessão curta com reautenticação para ações sensíveis e log imutável de cada ação (quem, quando, o quê).

**O que está acontecendo.** requireAdmin compara o e-mail do usuário com a lista; nenhuma verificação adicional; nenhum `console.log`/registro nas ações. O painel só aparece na UI para admins, mas a autorização é feita no servidor (correto).

**Por que isso é uma brecha.** A conta administrativa é o 'cofre' do sistema: com ela, um invasor libera contas gratuitas indefinidamente (perda de receita) e, se o e-mail admin for descoberto (é o e-mail pessoal do dono), phishing ou reutilização de senha vazada bastam. Sem trilha, um abuso não é detectado nem reconstruído.

**Sequência causal.** Senha do admin obtida (phishing, vazamento, força bruta facilitada por AUD-003) → login normal → POST /api/admin/free-accounts → acesso gratuito para terceiros; nenhum registro para investigar.

**Como alguém poderia abusar.** Reutilização de senha do dono vazada em outro serviço → login → liberação de dezenas de e-mails gratuitos, vendidos por fora.

**O que foi demonstrado.** Não testado (não há MFA a testar; comportamento verificado por código e T09 confirma que usuários comuns recebem 403).

**O que pode acontecer.** Perda de receita, contas fantasmas, dificuldade de resposta a incidente.

**Por que recebeu este nível.** MÉDIA: exige comprometer a senha; impacto econômico e de governança, sem acesso a dados de clientes.

**O que faria o nível subir ou descer.** Sobe para ALTA se funções admin passarem a ler/exportar dados de usuários. Desce para BAIXA com MFA + log.

**Como corrigir.** 1) Exigir MFA (TOTP ou WebAuthn) para contas em ADMIN_EMAILS — ao menos step-up na primeira ação admin da sessão. 2) Registrar cada ação admin em coleção `AuditLog` (ator, alvo, ação, IP, data) e enviar e-mail ao próprio admin. 3) Reautenticação (senha) antes de adicionar/remover contas gratuitas. 4) Senha do admin com ≥12 caracteres e verificação contra senhas vazadas.

**Como confirmar a correção.** 1) Admin sem MFA configurado → painel exige cadastro do fator. 2) Adicionar conta gratuita → registro em AuditLog com o e-mail do admin. 3) Usuário comum → 403 (mantido).

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** admin.controller.ts e env.ts citados; T09 (403 para não-admin).

**Risco residual:** Phishing resistente exige WebAuthn; TOTP reduz mas não elimina.

---

## AUD-009 — Campo avatarUrl aceito do cliente (mass assignment): URL arbitrária armazenada e usada na remoção de arquivos

- **Status:** CONFIRMADO (gravação) / PROVÁVEL (remoção de arquivo alheio) · **Confiança:** alta / média · **Severidade:** BAIXA
- **CVSS v4.0:** 3.5 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:L/UI:N/VC:N/VI:L/VA:N/SC:N/SI:L/SA:N`
- **CWE:** CWE-915 Modificação de atributos controlada externamente (mass assignment); CWE-73 Controle externo de nome de arquivo · **OWASP Top 10:2025:** A01:2025 Broken Access Control · **API Top 10:2023:** API3:2023 Broken Object Property Level Authorization · **ASVS:** V4 API (propriedades) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/validators/client.validators.ts:17 (`avatarUrl: z.string().optional()` em create/update); client.controller.ts deleteClient/uploadClientAvatar → utils/avatar.ts deleteAvatar (`del(avatarUrl, { token })`)
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** O usuário pode gravar qualquer texto no campo `avatarUrl` do seu cliente (deveria ser definido só pelo upload). Esse valor é usado depois para apagar o arquivo antigo no Vercel Blob com o token do servidor.

**Como deveria funcionar.** Campos derivados do servidor (URL do arquivo, ids, papéis, datas de pagamento) não devem ser aceitos do cliente; a remoção deve usar apenas caminhos que o servidor gerou.

**O que está acontecendo.** T08: PUT /api/clients/:id com `{"avatarUrl":"https://attacker.example/track.png"}` → 200 e valor armazenado. Em produção com BLOB_READ_WRITE_TOKEN, `deleteAvatar` chama `del(url, token)` para qualquer URL armazenada; a remoção de um blob de outro usuário exigiria conhecer sua URL (aleatória) — não demonstrado.

**Por que isso é uma brecha.** Aceitar o campo permite (a) apontar a foto para um servidor externo, que passa a receber o IP e o horário de cada visualização (rastreamento) e (b) pedir ao servidor que apague um arquivo cuja URL o atacante conheça, usando privilégio que o atacante não tem. Também permite armazenar strings sem limite (não há `max`).

**Sequência causal.** Cliente envia avatarUrl → validador aceita string qualquer → armazenado → deleteClient/upload chama del(avatarUrl) com o token do servidor → arquivo de terceiro pode ser apagado se a URL for conhecida.

**Como alguém poderia abusar.** Um usuário grava a URL de uma foto pública de outro usuário (obtida por compartilhamento) e remove o próprio cliente: o arquivo do outro usuário some.

**O que foi demonstrado.** Gravação de URL arbitrária (T08). Remoção cross-user não testada (produção/Blob fora do escopo).

**O que pode acontecer.** Rastreamento de acessos; remoção de fotos de outros usuários; poluição de dados.

**Por que recebeu este nível.** BAIXA: exige conhecer URLs aleatórias; o impacto é remoção de foto/rastreamento. Não INFORMATIVA porque há efeito real e privilégio do servidor envolvido.

**O que faria o nível subir ou descer.** Sobe para MÉDIA se URLs de blob forem listáveis ou previsíveis.

**Como corrigir.** 1) Remover `avatarUrl` dos schemas de create/update (ou aceitar apenas se igual ao valor atual). 2) Em `deleteAvatar`, só chamar `del` quando a URL começar com o prefixo do próprio store (`https://<store>.public.blob.vercel-storage.com/avatars/`) e contiver o `localId` do cliente. 3) Limitar tamanho de strings livres (`.max(…)`) em todos os validadores.

**Como confirmar a correção.** 1) PUT com avatarUrl externo → campo ignorado/400. 2) deleteAvatar com URL fora do prefixo → não chama `del`.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T08 linha 'stored avatarUrl = https://attacker.example/track.png'.

**Risco residual:** Nenhum relevante.

---

## AUD-010 — Enumeração de contas: cadastro responde 'já cadastrado' e o login responde ~15× mais rápido para e-mails inexistentes

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 2.3 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-204 Discrepância observável de resposta; CWE-208 Discrepância de tempo · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API2:2023 · **ASVS:** V6 Authentication (enumeração) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/controllers/auth.controller.ts requestRegisterCode (409 'Este e-mail já está cadastrado'); login (`if (!user) throw` antes de comparePassword)
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Dá para descobrir se um e-mail tem conta: o cadastro avisa explicitamente, e o login demora ~285 ms quando o e-mail existe (calcula o bcrypt) contra ~18 ms quando não existe.

**Como deveria funcionar.** Respostas e tempos devem ser indistinguíveis; no cadastro, enviar um e-mail informativo ao endereço já existente em vez de revelar na tela; no login, executar uma comparação de hash fictícia quando o usuário não existe.

**O que está acontecendo.** T07: 409 com mensagem explícita. T13: três medições — desconhecido 0,108/0,017/0,019 s; existente 0,360/0,286/0,286 s.

**Por que isso é uma brecha.** Saber quais e-mails têm conta alimenta credential stuffing (AUD-003), phishing direcionado e viola a privacidade dos clientes (revela que fulano usa o serviço). A recuperação de senha já é uniforme (controle validado), o que torna a falha localizada.

**Sequência causal.** E-mail alvo → POST request-code ou login → resposta/tempo diferente → confirmação de existência da conta.

**Como alguém poderia abusar.** Lista de e-mails de uma cidade → verificação em massa (limitada por AUD-003) → alvos para phishing de 'redefinição de senha'.

**O que foi demonstrado.** Ambos os canais.

**O que pode acontecer.** Privacidade e apoio a ataques de senha; sem acesso direto.

**Por que recebeu este nível.** BAIXA: informação limitada (existe/não existe) e usabilidade do cadastro conta a favor da mensagem explícita; corrigir o tempo do login é barato.

**O que faria o nível subir ou descer.** Sobe combinada com AUD-003/AUD-014.

**Como corrigir.** 1) Login: quando o usuário não existir, executar `comparePassword(data.password, DUMMY_HASH)` para igualar o tempo. 2) request-code: opcionalmente responder 200 genérico e enviar e-mail 'você já tem conta' ao endereço (trade-off de usabilidade — decisão de produto). 3) Manter a resposta uniforme do 'esqueci minha senha'.

**Como confirmar a correção.** Tempo médio de login para e-mail inexistente ≈ existente (±20%).

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T07, T13.

**Risco residual:** Enumeração pelo cadastro permanece se a mensagem for mantida por usabilidade.

---

## AUD-011 — Site (SPA) publicado sem cabeçalhos de segurança configurados — helmet protege apenas as respostas da API

- **Status:** PROVÁVEL · **Confiança:** média (produção não observada; configuração inexistente confirmada) · **Severidade:** BAIXA
- **CVSS v4.0:** 2.1 — `CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:A/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-1021 Restrição imprópria de frames (clickjacking); CWE-693 Falha de mecanismo de proteção · **OWASP Top 10:2025:** A02:2025 Security Misconfiguration · **API Top 10:2023:** API8:2023 · **ASVS:** V3 Web Frontend Security — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** vercel.json (sem bloco `headers`); client/index.html (2 scripts inline: tema e módulo); helmet só em server/src/app.ts (rotas /api e /uploads)
- **Owner / prazo / esforço:** Deploy · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** As páginas do app são servidas como arquivos estáticos pela Vercel; o helmet, que envia CSP, X-Frame-Options e afins, roda só no Express (API). Não há configuração de cabeçalhos para o HTML/JS.

**Como deveria funcionar.** O HTML deve chegar com Content-Security-Policy (script-src restrito, frame-ancestors 'none'), X-Content-Type-Options, Referrer-Policy e Permissions-Policy; HSTS na borda.

**O que está acontecendo.** T01 mostra os cabeçalhos do helmet em /api/health; vercel.json não define `headers`. A Vercel aplica HSTS por padrão em domínios *.vercel.app (não verificado nesta auditoria). O React escapa saídas e não há `dangerouslySetInnerHTML` (verificado por grep), o que reduz o risco de XSS.

**Por que isso é uma brecha.** Sem `frame-ancestors`, o site pode ser embutido em um iframe invisível em outra página (clickjacking) para induzir cliques em 'Remover' ou 'Sair'. Sem CSP, um XSS futuro ou um script de terceiro comprometido (fontes do Google são carregadas por CSS) teria liberdade total. São defesas em profundidade, não uma falha explorável hoje.

**Sequência causal.** HTML sem CSP/frame-ancestors → página embutível em iframe ou scripts externos sem restrição → clickjacking / amplificação de XSS futuro.

**Como alguém poderia abusar.** Página maliciosa embute o app em iframe transparente sobre um botão 'clique para ganhar' alinhado ao 'Remover'; vítima logada clica.

**O que foi demonstrado.** Ausência de configuração; comportamento em produção não observado.

**O que pode acontecer.** Ações indesejadas por clickjacking; menor contenção de XSS.

**Por que recebeu este nível.** BAIXA: exige interação da vítima e não há XSS conhecido; correção de configuração simples.

**O que faria o nível subir ou descer.** Sobe se surgir XSS ou se scripts de terceiros forem adicionados.

**Como corrigir.** Adicionar em vercel.json: `"headers": [{ "source": "/(.*)", "headers": [ {"key":"X-Frame-Options","value":"DENY"}, {"key":"X-Content-Type-Options","value":"nosniff"}, {"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"}, {"key":"Permissions-Policy","value":"camera=(), microphone=(), geolocation=()"}, {"key":"Content-Security-Policy","value":"default-src 'self'; script-src 'self' 'sha256-<hash do script inline do tema>'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.public.blob.vercel-storage.com; connect-src 'self' https://api.mercadopago.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"} ] }]`. Mover o script inline do tema para arquivo próprio para dispensar o hash.

**Como confirmar a correção.** curl -I na home em produção → cabeçalhos presentes; app carrega sem erros de CSP no console; fontes e avatares carregam.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** vercel.json (16 linhas, sem headers); T01.

**Risco residual:** CSP com 'unsafe-inline' em style permanece por causa do Tailwind/estilos inline.

---

## AUD-012 — CORS libera permanentemente as origens localhost/capacitor com credenciais, inclusive em produção

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 2.0 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:A/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-942 Política CORS permissiva · **OWASP Top 10:2025:** A02:2025 Security Misconfiguration · **API Top 10:2023:** API8:2023 · **ASVS:** V3 / V4 (CORS) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/config/env.ts clientOrigins `.concat(['https://localhost', 'capacitor://localhost', 'http://localhost'])`; app.ts middleware CORS
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Qualquer página servida em http://localhost ou https://localhost na máquina do usuário recebe permissão de chamar a API com credenciais (Access-Control-Allow-Credentials: true).

**Como deveria funcionar.** Em produção, apenas as origens do site (e do app nativo, se ainda existir) devem constar na allowlist; as origens de desenvolvimento devem depender de NODE_ENV.

**O que está acontecendo.** T02b: `Origin: http://localhost` → `Access-Control-Allow-Origin: http://localhost` + credenciais. Origem estranha (evil.example) não recebe cabeçalhos (controle validado). O cookie é SameSite=Lax, o que impede o navegador de anexá-lo em requisições cross-site iniciadas por script, limitando bastante o abuso.

**Por que isso é uma brecha.** Se um software local malicioso (ou um servidor de desenvolvimento de outro projeto na porta 80/443) abrir uma página em localhost, o navegador permitiria ler respostas da API — mas só se o cookie fosse enviado, o que SameSite=Lax bloqueia. O risco real hoje é residual; fica registrado porque o app Android (Capacitor) foi descontinuado e a exceção perdeu a razão de existir.

**Sequência causal.** Página em localhost → fetch com credentials → ACAO reflete localhost → (bloqueado por SameSite=Lax no cookie) → sem impacto atual.

**Como alguém poderia abusar.** Cenário limitado a navegadores antigos sem SameSite padrão ou a mudanças futuras de cookie.

**O que foi demonstrado.** Cabeçalhos CORS refletidos (T02b).

**O que pode acontecer.** Leitura de dados da vítima a partir de página local, apenas se o cookie deixar de ser Lax.

**Por que recebeu este nível.** BAIXA: bloqueado na prática por SameSite; é limpeza de superfície.

**O que faria o nível subir ou descer.** Sobe para MÉDIA se o cookie mudar para SameSite=None.

**Como corrigir.** Incluir as origens de desenvolvimento apenas quando `!env.isProduction`; remover `capacitor://localhost`/`https://localhost` já que o APK foi retirado.

**Como confirmar a correção.** Em produção, `Origin: http://localhost` → sem ACAO.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T02/T02b.

**Risco residual:** Nenhum.

---

## AUD-013 — Proteção contra CSRF depende exclusivamente de SameSite=Lax (sem token nem checagem de Origin nas mutações)

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 2.3 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:A/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-352 Cross-Site Request Forgery · **OWASP Top 10:2025:** A01:2025 Broken Access Control · **API Top 10:2023:** API8:2023 · **ASVS:** V4 API and Web Service (CSRF) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/controllers/auth.controller.ts setAuthCookie (sameSite: 'lax'); app.ts (sem verificação de Origin em POST/PUT/DELETE; express.json aceita só application/json; multer em /clients/:id/avatar aceita multipart)
- **Owner / prazo / esforço:** Desenvolvimento · ESTRATÉGICO, até 90 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Nada além do atributo SameSite=Lax do cookie impede que um site externo faça o navegador da vítima enviar uma requisição de alteração para a API.

**Como deveria funcionar.** Defesa em profundidade: SameSite + validação do cabeçalho Origin/Referer nas mutações (ou token anti-CSRF), e rejeição de content-types não esperados.

**O que está acontecendo.** Requisições JSON não podem ser criadas por formulários HTML e `express.json` ignora `text/plain`, o que protege as rotas JSON. O upload multipart poderia ser disparado por um `<form>` cross-site, mas o navegador não envia o cookie Lax em POST cross-site — logo, hoje nenhum caminho foi demonstrado.

**Por que isso é uma brecha.** CSRF ('falsificação de requisição entre sites') é quando um site malicioso usa a sessão da vítima para agir em seu nome. A proteção atual é correta para navegadores modernos, mas única: uma futura mudança para SameSite=None (ex.: para embutir o app) abriria todas as mutações de uma vez.

**Sequência causal.** Página maliciosa → formulário POST multipart para /api/clients/:id/avatar → cookie não enviado (Lax) → 401. Se Lax fosse removido → upload no nome da vítima.

**Como alguém poderia abusar.** Não aplicável hoje; registrado como defesa em profundidade.

**O que foi demonstrado.** Análise de código; nenhum caminho de exploração atual.

**O que pode acontecer.** Alterações na conta da vítima caso a única camada caia.

**Por que recebeu este nível.** BAIXA: controle existente e eficaz; achado de arquitetura.

**O que faria o nível subir ou descer.** Sobe para ALTA se SameSite for relaxado.

**Como corrigir.** Middleware nas rotas de mutação: rejeitar quando `Origin`/`Referer` presente e fora da allowlist (o app nativo com Bearer não envia cookie e pode ser isento); usar prefixo `__Host-` no nome do cookie em produção; exigir `Content-Type: application/json` nas rotas JSON.

**Como confirmar a correção.** POST /api/clients com Origin externo e cookie válido → 403; com Origin do site → 201.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** auth.controller.ts setAuthCookie; app.ts.

**Risco residual:** Nenhum.

---

## AUD-014 — Política de senha abaixo do recomendado (mínimo de 6 caracteres, sem bloqueio de senhas vazadas)

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 2.7 — `CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`
- **CWE:** CWE-521 Requisitos fracos de senha · **OWASP Top 10:2025:** A07:2025 Authentication Failures · **API Top 10:2023:** API2:2023 · **ASVS:** V6 Authentication (senhas) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/validators/auth.validators.ts newPasswordField `min(6)`; client/src/pages/Register.tsx e ResetPassword.tsx (mesmo mínimo)
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Senhas de 6 caracteres são aceitas e não há verificação contra listas de senhas já vazadas (ex.: '123456' passa).

**Como deveria funcionar.** NIST SP 800-63B: mínimo de 8 caracteres (15 quando sem MFA é recomendado), comparação com senhas comprometidas/comuns, sem regras de composição arbitrárias, permitir senhas longas.

**O que está acontecendo.** `z.string().min(6)`; nenhum blocklist; bcrypt custo 12 (adequado — controle validado).

**Por que isso é uma brecha.** Com AUD-003 (limite por IP quebrado) e AUD-010 (enumeração), senhas curtas e comuns são o caminho mais barato para invadir contas; o hash forte só protege se a senha não for trivial.

**Sequência causal.** Senha '123456' aceita → e-mail conhecido → tentativas de senhas comuns (limitadas fracamente) → acesso.

**Como alguém poderia abusar.** Credential stuffing com pares e-mail/senha vazados de outros serviços.

**O que foi demonstrado.** Regra de validação lida no código.

**O que pode acontecer.** Takeover de contas com senhas fracas.

**Por que recebeu este nível.** BAIXA isoladamente; relevante em cadeia com AUD-003.

**O que faria o nível subir ou descer.** Sobe para MÉDIA enquanto AUD-003 não for corrigida.

**Como corrigir.** `min(8)` (idealmente 10) + `max(128)`; rejeitar as ~10 mil senhas mais comuns (lista local) ou consultar a API k-anonymity do Have I Been Pwned (prefixo SHA-1 de 5 caracteres, sem enviar a senha); indicador de força no formulário.

**Como confirmar a correção.** Cadastro com '123456' → 400; com 'correto cavalo bateria' → 201.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** auth.validators.ts linha do newPasswordField.

**Risco residual:** Reutilização de senhas fortes vazadas em outros sites só é mitigada por MFA.

---

## AUD-015 — Webhook de pagamento aceita chamadas anônimas sem assinatura (segredo opcional) e sem limite de taxa

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 2.0 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N`
- **CWE:** CWE-306 Ausência de autenticação para função crítica (parcial); CWE-770 · **OWASP Top 10:2025:** A02:2025 Security Misconfiguration · **API Top 10:2023:** API4:2023 / API10:2023 Unsafe Consumption of APIs · **ASVS:** V4 (webhooks) — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/app.ts (POST /api/billing/webhook); services/billing.ts verifyWebhookSignature (`if (!secret) return true`)
- **Owner / prazo / esforço:** Deploy / Desenvolvimento · CURTO, até 7 dias (antes de ativar a cobrança) · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Se MP_WEBHOOK_SECRET não for definido, qualquer pessoa pode chamar o webhook com um id de pagamento; o servidor então consulta a API do Mercado Pago com o token da loja. Não há limite de chamadas.

**Como deveria funcionar.** Webhooks devem exigir assinatura válida (obrigatória em produção), ter limite de taxa e registrar tentativas inválidas.

**O que está acontecendo.** T11: POST anônimo com corpo arbitrário → 200. Ponto positivo (controle validado): o servidor nunca confia no corpo — busca o pagamento no Mercado Pago e só aplica se aprovado e vinculado ao usuário pelo `external_reference`; por isso não há fraude de crédito por esse caminho.

**Por que isso é uma brecha.** Sem assinatura, o endpoint vira um 'amplificador': cada chamada anônima gera uma chamada autenticada ao Mercado Pago, podendo esgotar cotas ou gerar bloqueio temporário da integração (indisponibilidade dos pagamentos). A assinatura também é a única forma de saber que a notificação veio do Mercado Pago.

**Sequência causal.** POST anônimo em massa → aplicação consulta MP a cada chamada → cota/limite da API do MP consumida → confirmações legítimas falham.

**Como alguém poderia abusar.** Script chama o webhook milhares de vezes com ids aleatórios.

**O que foi demonstrado.** Aceitação de chamada anônima (T11).

**O que pode acontecer.** Indisponibilidade da confirmação de pagamentos; custo de logs.

**Por que recebeu este nível.** BAIXA: sem impacto de integridade (verificado no código); apenas consumo.

**O que faria o nível subir ou descer.** Sobe para MÉDIA se a lógica passar a confiar em campos do corpo.

**Como corrigir.** 1) Tornar MP_WEBHOOK_SECRET obrigatório em produção (falhar no boot). 2) Rate limit no webhook e no /billing/confirm. 3) Validar formato numérico do id antes de consultar. 4) Logar assinaturas inválidas com IP.

**Como confirmar a correção.** Webhook sem assinatura em produção → 401; com assinatura correta → 200.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** audit-evidence T11; billing.ts verifyWebhookSignature.

**Risco residual:** Nenhum.

---

## AUD-016 — Dependências com vulnerabilidades conhecidas (npm audit: 4 altas, 8 moderadas) — alcance avaliado por pacote

- **Status:** CONFIRMADO (versões) / alcance por pacote no texto · **Confiança:** alta · **Severidade:** BAIXA (exceto sharp/multer, tratados em AUD-002)
- **CVSS v4.0:** 3.7 — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N`
- **CWE:** CWE-1395 Dependência vulnerável · **OWASP Top 10:2025:** A03:2025 Software Supply Chain Failures · **API Top 10:2023:** API8:2023 · **ASVS:** V15 Secure Coding and Architecture (componentes) — referência exata não verificada
- **CISA KEV / EPSS:** não consultado (nenhum CVE com KEV identificado nos avisos listados)
- **Onde está:** package-lock.json (raiz do workspace); server/package.json; client/package.json
- **Owner / prazo / esforço:** Desenvolvimento · MÉDIO, até 30 dias · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** O `npm audit` aponta 12 avisos. Após análise de alcance: nodemailer 6.10.1 (avisos de CRLF/DoS no parser de endereços — entradas aqui passam por validação `email()` do zod e não usam `raw`/`jsonTransport`, alcance baixo); express 4.22.2/body-parser/qs (bypass de limite de array e DoS em `isBuffer`, moderado, alcançável via query string); mercadopago→uuid 9 (bounds check em v3/v5 com buffer — não usado nesse modo, alcance improvável); morgan (log forging — só em desenvolvimento); @capacitor/cli→xmldom/xcode (somente build local do APK, descontinuado); sharp e multer (alcançáveis — AUD-002).

**Como deveria funcionar.** Dependências atualizadas rotineiramente, `npm audit` no build e remoção do que não é mais usado.

**O que está acontecendo.** Lista completa em audit-evidence e no JSON deste achado. Lockfile presente (controle validado); Vercel instala com `npm install` a partir dele.

**Por que isso é uma brecha.** Bibliotecas de terceiros executam com os mesmos privilégios do servidor. Mesmo avisos 'moderados' em parsing de query string (qs) podem virar negação de serviço com uma requisição bem construída.

**Sequência causal.** Versão vulnerável instalada → entrada externa alcança a função afetada (query string, multipart, imagem) → DoS ou pior.

**Como alguém poderia abusar.** Requisição com query string patológica para qs; ver AUD-002 para upload.

**O que foi demonstrado.** Versões e avisos; alcance por leitura de código.

**O que pode acontecer.** Negação de serviço; comprometimento via decodificadores (AUD-002).

**Por que recebeu este nível.** BAIXA para o conjunto residual (fora sharp/multer) por alcance limitado; correção é `npm update`.

**O que faria o nível subir ou descer.** Sobe conforme novos avisos; consultar KEV/EPSS ao atualizar.

**Como corrigir.** 1) `npm update` nos pacotes diretos (sharp, multer, nodemailer, morgan, express); `npm audit fix`. 2) Remover @capacitor/* e o diretório client/android se o app nativo não voltar. 3) Adicionar `npm audit --audit-level=high` ao script de build/CI e dependabot/renovate no GitHub.

**Como confirmar a correção.** `npm audit --audit-level=high` → 0 vulnerabilidades.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** `npm audit --json` (resumo: high 4, moderate 8) executado em 2026-09-14; `npm ls` para caminhos transitivos.

**Risco residual:** Avisos futuros; processo contínuo.

---

## AUD-017 — Sem registro de eventos de segurança nem alertas (logins falhos, redefinições, ações admin, pagamentos)

- **Status:** CONFIRMADO · **Confiança:** alta · **Severidade:** BAIXA
- **CVSS v4.0:** 0.0 — `não aplicável (ausência de controle detectivo)`
- **CWE:** CWE-778 Registro insuficiente; CWE-223 Omissão de informação relevante para segurança · **OWASP Top 10:2025:** A09:2025 Security Logging and Alerting Failures · **API Top 10:2023:** API8:2023 · **ASVS:** V16 Security Logging and Error Handling — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** server/src/app.ts (morgan só fora de produção); controllers de auth/admin/billing (apenas console.error em falhas)
- **Owner / prazo / esforço:** Desenvolvimento / Operação · MÉDIO, até 30 dias · médio

### Camada 1 — Entenda a brecha

**O que encontramos.** Em produção o servidor não registra quem tentou entrar, quem redefiniu senha, quem liberou contas gratuitas ou quais pagamentos foram aplicados; erros vão para o log efêmero da Vercel.

**Como deveria funcionar.** Eventos mínimos com ator, tenant, ação, resultado, IP e data, enviados a um destino com retenção e alertas para anomalias (rajadas de falhas, ações admin).

**O que está acontecendo.** Nenhuma chamada de log estruturado nos fluxos citados; `morgan('dev')` desativado em produção.

**Por que isso é uma brecha.** Sem registros não há como perceber um ataque de senha em andamento, provar quem liberou uma conta ou reconstruir um incidente — os achados AUD-001/003/008 ficariam invisíveis mesmo em exploração.

**Sequência causal.** Ataque ou abuso → nenhum evento gravado → nenhuma detecção → descoberta apenas por efeito colateral (reclamação, fatura).

**Como alguém poderia abusar.** Não é um vetor por si; é a ausência de resposta.

**O que foi demonstrado.** Leitura de código.

**O que pode acontecer.** Incidentes prolongados e não investigáveis.

**Por que recebeu este nível.** BAIXA como item isolado; multiplicador de impacto dos demais.

**O que faria o nível subir ou descer.** —

**Como corrigir.** 1) Logger estruturado (pino) com eventos: login ok/falha (sem senha), reset solicitado/concluído, troca de senha, admin.free_account.add/remove, billing.payment.applied, webhook inválido, 402/403. 2) Enviar para Vercel Log Drain ou serviço (Axiom/Logtail) com retenção ≥90 dias. 3) Alertas: >10 falhas de login por conta/hora; qualquer ação admin; erro 5xx acima de limiar. 4) Nunca registrar tokens, senhas ou corpo de e-mail.

**Como confirmar a correção.** Simular 3 logins falhos → 3 eventos no destino com ator e IP; ação admin → evento com e-mail do admin.

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** app.ts linhas do morgan; grep por `console.log`/logger nos controllers.

**Risco residual:** Depende de alguém olhar os alertas; definir responsável.

---

## AUD-018 — Observações informativas: token no corpo da resposta web, usuário/hosts do Atlas no repositório, erro 413 mapeado como 500, dados locais no dispositivo, backup do Atlas não verificado

- **Status:** INFORMATIVO · **Confiança:** alta · **Severidade:** INFORMATIVA
- **CVSS v4.0:** 0.0 — `não aplicável`
- **CWE:** CWE-200 (exposição de informação de configuração); CWE-209 (mensagens de erro) · **OWASP Top 10:2025:** A02:2025 Security Misconfiguration · **API Top 10:2023:** API8:2023 · **ASVS:** V13 Configuration / V14 Data Protection — referência exata não verificada
- **CISA KEV / EPSS:** não aplicável
- **Onde está:** auth.controller.ts login/register (`token` no JSON também para web); server/.env.example (usuário `…_db_user` e hosts do cluster, sem senha); errorHandler.ts (entity.too.large → 500, T14); client/src/db (IndexedDB com dados do usuário até logout); MongoDB Atlas (plano/backup desconhecido)
- **Owner / prazo / esforço:** Desenvolvimento / Operação · ESTRATÉGICO, até 90 dias (exceto (e): verificar em 7 dias) · baixo

### Camada 1 — Entenda a brecha

**O que encontramos.** Conjunto de pontos sem caminho de exploração demonstrável: (a) o JWT é devolvido no corpo do login mesmo para o site, onde o cookie já basta — fica visível a extensões/scripts; (b) o `.env.example` público revela o nome do usuário do banco e os hosts do Atlas (a senha está mascarada); (c) corpo acima de 100 kB responde 500 em vez de 413; (d) os dados ficam no IndexedDB do navegador até 'Sair' — em computadores compartilhados, fechar a aba não os remove; (e) não foi possível verificar se o cluster tem backup e teste de restauração (clusters gratuitos M0 não têm backup automático).

**Como deveria funcionar.** Minimizar o que sai na resposta; exemplos de configuração sem dados reais; códigos HTTP corretos; aviso ao usuário sobre dispositivos compartilhados; backup verificado.

**O que está acontecendo.** Itens listados verificados por código/teste (T14) e leitura do repositório; backup não verificável.

**Por que isso é uma brecha.** Cada item reduz a margem de erro em cenários futuros (extensão maliciosa, ataque ao Atlas com usuário conhecido, perda de dados sem backup).

**Sequência causal.** —

**Como alguém poderia abusar.** —

**O que foi demonstrado.** Ver 'observed'.

**O que pode acontecer.** Baixo; item (e) pode significar perda total de dados em falha do banco.

**Por que recebeu este nível.** INFORMATIVA por definição do prompt: sem exploração demonstrável.

**O que faria o nível subir ou descer.** (e) vira ALTA se confirmado que não há backup.

**Como corrigir.** (a) Devolver `token` só quando a requisição vier com header do app nativo (ou removê-lo, já que o APK foi descontinuado). (b) Trocar o exemplo por `mongodb+srv://USUARIO:SENHA@SEU-CLUSTER/gestor`. (c) Mapear `entity.too.large` → 413. (d) Texto em Configurações: 'Em computador compartilhado, clique em Sair'. (e) Confirmar plano do Atlas; em M0, agendar `mongodump` semanal para storage privado e testar restauração.

**Como confirmar a correção.** —

### Camada 2 — Detalhes técnicos

**Evidência (redigida):** T14 (500 para 200 kB); `.env.example` linha MONGO_URL; auth.controller.ts.

**Risco residual:** —
