# Sumário executivo — auditoria de segurança do GestorFinance

**Data:** 14/09/2026 · **Commit:** `903f4466` (branch `main`) + 55 arquivos ainda não commitados (assinatura, ícone, PWA), auditados no estado do disco · **Modo:** análise estática completa + testes locais seguros em `localhost` com conta demo e dados canário; **produção não foi tocada**.

## Veredicto (condicionado)

O sistema tem uma base sólida: o isolamento entre contas foi testado e funciona (nenhum usuário lê, altera ou apaga dados de outro), as senhas usam bcrypt, os tokens de recuperação são fortes e de uso único, a validação de entrada bloqueia injeção NoSQL e a interface não tem os padrões clássicos de XSS. **Nenhuma falha crítica foi confirmada.**

Há, porém, **2 riscos ALTOS e 6 MÉDIOS** que precisam de atenção antes de escalar a base de clientes — dois deles podem ser resolvidos hoje em menos de uma hora. Confiança geral da avaliação: **média-alta** para o código e a API (testados), **baixa** para infraestrutura da Vercel e do MongoDB Atlas (não observáveis nesta auditoria).

## Os 5 riscos principais, em linguagem de negócio

1. **Qualquer pessoa pode entrar no sistema publicado com a conta demo** (AUD-001, ALTA). A senha está escrita no código, o repositório é público e a conta existe no banco real. Quem entra usa o produto de graça e ganha uma "porta de entrada" autenticada para outras falhas. *Correção: apagar a conta demo de produção — minutos.*
2. **Uma imagem maliciosa enviada como foto de cliente pode derrubar o servidor** (AUD-002, ALTA) e, em teoria, executar código nele, porque a biblioteca de imagens está numa versão com falha conhecida e o filtro confia no tipo que o navegador declara. *Correção: atualizar `sharp`/`multer` e conferir o formato pelo conteúdo — 1 hora.*
3. **O limite de tentativas de senha não funciona atrás da Vercel** (AUD-003, MÉDIA): todos os visitantes dividem o mesmo contador. Vinte erros de qualquer pessoa bloqueiam o login de todos por 15 minutos, e ataques de senha só são freados pela lentidão do bcrypt.
4. **Trocar a senha não expulsa quem já estava dentro** (AUD-004, MÉDIA): sessões valem 7 dias e não podem ser revogadas — justamente o que um cliente espera ao usar "esqueci minha senha" após suspeitar de invasão.
5. **A cobrança pode creditar 60 dias por um único pagamento** se duas confirmações chegarem ao mesmo tempo, e estornos não cancelam o acesso (AUD-007, MÉDIA). *Corrigir antes de ativar o Mercado Pago.*

## Caminhos de ataque compostos mais perigosos

- **AUD-001 → AUD-002:** conta demo pública elimina a única pré-condição ("estar logado") do upload de imagem malicioso: um desconhecido pode causar indisponibilidade da API de todos os clientes.
- **AUD-010 + AUD-014 + AUD-003:** descobrir quais e-mails têm conta, aceitar senhas de 6 caracteres e um limitador inoperante formam a receita clássica de *credential stuffing*; **AUD-004** garante que a sessão obtida sobreviva à troca de senha; **AUD-017** garante que ninguém perceba.
- **AUD-005:** se a borda aceitar um Host forjado, o e-mail de "esqueci minha senha" leva o cliente a um domínio do atacante — tomada de conta com um clique.

## Controles fortes comprovados

Isolamento por usuário em leitura/escrita/exclusão (teste com conta canário); JWT `alg:none` rejeitado; cookie HttpOnly + SameSite=Lax; bcrypt custo 12; códigos/tokens de recuperação com HMAC, uso único, expiração e limite de tentativas; resposta uniforme no "esqueci minha senha"; validação zod em todas as rotas; erros genéricos; nenhum segredo no histórico Git; sem sinks de XSS nem source maps; helmet na API; CORS rejeita origens estranhas; autorização de admin no servidor; bloqueio de plano (402) no servidor; pagamento com preço definido no servidor e idempotente por id; imagens reprocessadas. Detalhes em `05-positive-controls.md`.

## Números

| Severidade | Confirmado | Provável | Hipótese | Informativo |
|---|---|---|---|---|
| ALTA | 1 (AUD-001) | 1 (AUD-002) | 0 | — |
| MÉDIA | 3 (AUD-003, 004, 006) | 2 (AUD-005, 007) | 1 (AUD-008) | — |
| BAIXA | 7 (AUD-009*, 010, 012, 013, 014, 015, 016) | 1 (AUD-011) | 0 | — |
| INFORMATIVA | — | — | — | 1 (AUD-018) |

\* AUD-009: gravação confirmada; efeito de remoção de arquivo alheio é provável. Controles validados: 18.

**Cobertura (controles aplicáveis testados / identificados):** V1 3/3 · V2 4/4 · V3 5/5 · V4 4/4 · V5 4/4 · V6 9/9 · V7 3/3 · V8 4/4 · V9 3/3 · V11 2/2 · V12 1/2 (TLS de borda não testado) · V13 4/4 · V14 2/3 (backup não testado) · V15 2/2 · V16 2/2 · V10/V17 não aplicáveis · Top 10: 9/10 (A08 não testado) · API Top 10: 10/10. Total: **61 de 64 aplicáveis (95%)**; 3 não testados por falta de acesso à infraestrutura.

## Limitações críticas

Produção (site na Vercel), painel do MongoDB Atlas (rede, backups), variáveis de ambiente efetivas de produção e o fluxo real de pagamento não foram observados. Nenhum scanner (Semgrep, Gitleaks, OSV) estava instalado e nenhum foi instalado; a busca de segredos e a análise de código foram manuais. Ver `07-limitations-not-tested.md`.

## Plano

- **24–48 h:** remover a conta demo de produção e endurecer `seed.ts` (AUD-001); definir `APP_URL` e `MP_WEBHOOK_SECRET` obrigatórios (AUD-005, AUD-015).
- **7 dias:** atualizar `sharp`/`multer` e validar formato por conteúdo (AUD-002); `trust proxy` + limite por conta com store compartilhado (AUD-003); aplicação atômica de pagamento com validação de valor e tratamento de estorno (AUD-007) — antes de ligar a cobrança.
- **30 dias:** revogação de sessão por versão + validade menor (AUD-004); escape e limite na busca (AUD-006); MFA e trilha de auditoria para admin (AUD-008); remover `avatarUrl` do cliente (AUD-009); tempo uniforme no login (AUD-010); cabeçalhos no `vercel.json` (AUD-011); política de senha (AUD-014); `npm audit` no build (AUD-016); logging de segurança (AUD-017); confirmar backup do Atlas (AUD-018e).
- **90 dias:** checagem de Origin/`__Host-` (AUD-013); limpeza de CORS (AUD-012); SBOM e dependabot; plano de resposta a incidentes com rotação de `JWT_SECRET`.
