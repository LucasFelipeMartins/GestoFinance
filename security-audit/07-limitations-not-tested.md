# 07 — Limitações e itens não testados

Registro honesto do que esta auditoria **não** conseguiu comprovar. Cada item reduz a confiança da conclusão correspondente.

## Ativos sem acesso

| Ativo | O que não foi verificado | Impacto na confiança |
|---|---|---|
| Site publicado na Vercel | Cabeçalhos HTTP reais (HSTS, CSP), redirecionamento HTTPS, variáveis de ambiente efetivas (`NODE_ENV`, `APP_URL`, `CLIENT_ORIGIN`, `MP_*`, `ADMIN_EMAILS`), comportamento do proxy com `X-Forwarded-*`, logs | AUD-005, AUD-011, AUD-012 permanecem PROVÁVEL/condicionados; AUD-003 confirmado por código + teste local, mas o efeito exato na Vercel (instâncias) é inferido |
| MongoDB Atlas | Lista de IPs permitidos, usuário/permissões do banco, criptografia em repouso, **backups e teste de restauração**, plano (M0?) | AUD-018e é hipótese; perda de dados por falha não coberta |
| Vercel Blob | ACL do store, listagem, capacidade de `del` em URLs de outros usuários | AUD-009 (parte de remoção) é PROVÁVEL |
| Mercado Pago | Fluxo real de pagamento, webhook autêntico, concorrência webhook/confirm, valores | AUD-007 é PROVÁVEL (código) |
| Provedores de e-mail | Entrega, SPF/DKIM/DMARC do domínio remetente (phishing com o nome do produto) | não avaliado |
| GitHub | Proteção de branch, revisores, dependabot, secret scanning, tokens de deploy | A08 (integridade de build/CI) NÃO TESTADO |

## Testes dinâmicos deliberadamente não executados

- **ReDoS real** contra o banco (AUD-006): padrão patológico não enviado porque o servidor local usa o cluster de produção compartilhado.
- **Exploit de imagem** (AUD-002): nenhum arquivo malicioso foi construído/enviado.
- **Envio de e-mails** (request-code, forgot-password com Host forjado): o `.env` local tem SMTP real; evitado para não gerar e-mails e custo.
- **Pagamentos**: nenhum checkout criado com token real.
- **Força bruta/credential stuffing**: apenas 22 requisições de login com senha errada para medir o limitador; nenhuma tentativa de adivinhar senhas reais.
- **Carga/DoS**: nenhum.

## Contas e papéis

- Não existiam contas de teste com papéis diferentes; a auditoria criou e removeu um usuário canário comum. Não foi testada uma conta admin real (o painel admin foi validado por código e por 403 para usuário comum; o fluxo admin completo foi exercitado em sessão de desenvolvimento anterior com conta temporária, não como parte formal desta auditoria).
- Não há tenant além do usuário individual; testes cross-tenant equivalem a cross-usuário (executados).

## Ferramentas

- Sem Semgrep/CodeQL (SAST automatizado), Gitleaks (segredos), OSV-Scanner/Trivy (SCA/SBOM), ZAP (DAST). Nada foi instalado, conforme a Regra Zero. Cobertura de SAST/segredos é manual e dirigida: pode haver padrões não cobertos.
- `npm audit` consultou o registro npm com os nomes/versões dos pacotes (metadados públicos), sem enviar código.
- KEV e EPSS não consultados online.

## Requisitos não aplicáveis

ASVS V10 (OAuth/OIDC), V17 (WebRTC), OWASP AISVS/LLMSVS (sem IA), MASVS (app móvel não distribuído — `flutter_app/` e `client/android` fora do escopo). O app Flutter chama os mesmos endpoints; se for publicado, deve ser auditado separadamente (armazenamento do token, pinning, deep links).

## Confiança resultante

- Código e API: **média-alta** — leitura integral dos controllers, validadores, middlewares, serviços e configuração; 15 testes locais.
- Frontend: **média** — sinks e armazenamento verificados; comportamento em produção (cabeçalhos, SW/PWA) não observado.
- Infraestrutura/operacional: **baixa** — não observável a partir do código.

Uma próxima etapa com maior confiança exigiria: (1) autorização para observação passiva do site publicado (`curl -I`, navegação sem exploração); (2) um ambiente de staging com credenciais de teste do Mercado Pago e conta admin de teste; (3) acesso somente leitura ao painel do Atlas/Vercel ou capturas de tela das configurações; (4) aprovação para instalar Semgrep/Gitleaks/OSV-Scanner em versões fixadas.
