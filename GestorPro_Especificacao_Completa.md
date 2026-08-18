# GESTORPRO — ESPECIFICAÇÃO COMPLETA DE UI/UX E IMPLEMENTAÇÃO

**Versão:** 1.0  
**Data:** 18/08/2026  
**Status:** Especificação base para desenvolvimento  
**Produto:** Plataforma web para gerenciamento de clientes e tarefas  

---

## 1. OBJETIVO DO PRODUTO

O GestorPro é uma plataforma web responsiva para gerenciamento de clientes e tarefas, com foco em:

- visualização rápida da operação;
- cadastro, edição e remoção de clientes;
- acompanhamento de prioridades;
- cadastro, edição e remoção de tarefas;
- marcação de itens como concluídos;
- organização visual por status e prioridade;
- acesso rápido às informações mais relevantes pela Home;
- experiência consistente em desktop, tablet e smartphone.

A aplicação deve transmitir uma sensação visual de **produto SaaS premium, moderno, limpo, confiável e profissional**, sem aparência de sistema administrativo antigo.

A interface deve priorizar **clareza, velocidade, hierarquia visual e baixa carga cognitiva**.

---

# 2. DIRETRIZES VISUAIS PRINCIPAIS

## 2.1 Conceito

A interface deve seguir estes princípios:

1. Minimalismo funcional.
2. Fundo claro e arejado.
3. Verde como identidade principal.
4. Verde escuro utilizado para navegação e ações primárias.
5. Cards com bordas arredondadas.
6. Sombras muito suaves.
7. Campos e botões com sensação de profundidade discreta.
8. Tipografia moderna e altamente legível.
9. Ícones simples, lineares e consistentes.
10. Estados de prioridade destacados por cores.
11. Espaçamento generoso entre grupos de informações.
12. Nenhuma tela deve parecer visualmente congestionada.

---

# 3. PALETA OFICIAL

A paleta abaixo é obrigatória e deve ser utilizada como base de toda a aplicação.

| Token | Nome | HEX | Uso principal |
|---|---|---|---|
| `--color-tea-green` | Tea Green | `#C9F2C7` | fundos suaves, estados de sucesso, destaques |
| `--color-light-green` | Light Green | `#ACECA1` | hover suave, gradientes, elementos de destaque |
| `--color-muted-olive` | Muted Olive | `#96BE8C` | elementos secundários, badges, áreas informativas |
| `--color-sage-green` | Sage Green | `#629460` | ações, ícones, elementos de interação |
| `--color-evergreen` | Evergreen | `#243119` | sidebar, textos fortes, botões primários |

## 3.1 Cores auxiliares obrigatórias

Como a paleta principal não cobre estados destrutivos, neutros e prioridades, podem ser utilizadas cores auxiliares controladas.

### Prioridades

| Prioridade | Cor | HEX recomendado |
|---|---|---|
| Máxima | Vermelho | `#E53935` |
| Alta | Laranja | `#FB8C00` |
| Média | Amarelo | `#F4C20D` |
| Baixa | Roxo | `#7E57C2` |
| Muito baixa | Azul | `#1E88E5` |

### Estados

| Estado | Cor principal |
|---|---|
| Sucesso | `#629460` |
| Sucesso claro | `#C9F2C7` |
| Atenção | `#F4C95D` |
| Erro | `#D93A3A` |
| Texto secundário | `#66705F` |
| Bordas | `#DDE7D9` |
| Fundo geral | `#F7FAF5` |
| Fundo puro | `#FFFFFF` |
| Texto principal | `#182014` |

As cores auxiliares não devem substituir a identidade verde. Elas devem ser usadas apenas quando houver necessidade semântica.

---

# 4. TIPOGRAFIA

A aplicação deve utilizar uma fonte sans-serif moderna.

**Recomendação:** Inter.

Fallback:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

## 4.1 Escala tipográfica

| Token | Tamanho | Peso |
|---|---:|---:|
| Display | 32px | 700 |
| H1 | 28px | 700 |
| H2 | 22px | 700 |
| H3 | 18px | 650 |
| Body large | 16px | 400 |
| Body | 14px | 400 |
| Body strong | 14px | 600 |
| Caption | 12px | 400/500 |
| Micro | 11px | 500 |

Desktop deve utilizar H1 entre 28–32px.  
Mobile deve reduzir H1 para aproximadamente 24px.

---

# 5. GRID E ESPAÇAMENTO

Utilizar sistema baseado em múltiplos de 4px.

Valores principais:

```text
4px   → micro espaçamento
8px   → espaçamento interno pequeno
12px  → entre elementos relacionados
16px  → espaçamento padrão
20px  → separação de blocos
24px  → padding de card
32px  → separação entre seções
40px  → grandes blocos
48px+ → áreas de destaque
```

## 5.1 Border radius

| Elemento | Radius |
|---|---:|
| Cards | 18px |
| Modal | 20px |
| Inputs | 12px |
| Botões | 12px |
| Badge | 999px |
| Avatar | 50% |
| Sidebar desktop | 0–24px conforme composição visual |

Não utilizar excesso de arredondamento em elementos pequenos.

---

# 6. SOMBRAS

As sombras devem ser muito suaves.

### Card

```css
box-shadow: 0 6px 24px rgba(36, 49, 25, 0.06);
```

### Card elevado / modal

```css
box-shadow: 0 18px 50px rgba(36, 49, 25, 0.12);
```

### Hover

O hover pode aumentar levemente a sombra, porém nunca gerar sensação de botão 3D pesado.

---

# 7. LAYOUT GERAL DESKTOP

## 7.1 Estrutura

A aplicação será formada por:

```text
┌────────────────────────────────────────────────────────────┐
│ SIDEBAR │ HEADER                                            │
│         ├───────────────────────────────────────────────────┤
│         │                                                   │
│         │                CONTEÚDO DA PÁGINA                │
│         │                                                   │
│         │                                                   │
│         └───────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

## 7.2 Sidebar

Largura desktop recomendada:

- largura fixa: `250px`;
- altura: `100vh`;
- posição: `fixed` ou `sticky`;
- fundo: `#243119`;
- conteúdo branco ou Tea Green;
- padding interno: `18–24px`.

### Logo

Topo da sidebar:

- ícone de marca;
- nome **GestorPro**;
- subtítulo **Clientes & Tarefas**.

### Menu principal

Ordem obrigatória:

1. Home
2. Clientes
3. Tarefas

### Área inferior

Separada visualmente do menu principal:

1. Configurações
2. Sair

### Estado ativo

O item ativo deve possuir:

- fundo `#C9F2C7`;
- texto `#243119`;
- ícone `#243119`;
- border-radius aproximado de `12px`;
- transição de `180–220ms`.

---

# 8. HEADER DESKTOP

O header fica na área de conteúdo e não dentro da sidebar.

Elementos:

- saudação;
- subtítulo;
- data atual;
- notificações;
- modo claro/escuro, caso implementado;
- avatar do usuário.

### Exemplo

```text
Olá, Lucas Felipe!
Gerencie seus clientes e tarefas de forma simples e eficiente.
```

A data deve ser calculada dinamicamente pelo sistema. Não utilizar data fixa do mockup.

---

# 9. NAVEGAÇÃO MOBILE

Em smartphones, a sidebar deve desaparecer.

Utilizar navegação inferior fixa.

Estrutura recomendada:

```text
┌─────────────────────────────┐
│             conteúdo        │
│                             │
├─────────────────────────────┤
│ Home Clientes  +  Tarefas  Mais │
└─────────────────────────────┘
```

## 9.1 Itens

- Home
- Clientes
- botão central de ação `+`
- Tarefas
- Mais

### Botão central

O botão `+` deve ser circular, maior que os demais itens e visualmente destacado.

Ao tocar:

```text
Adicionar Cliente
Adicionar Tarefa
```

Pode aparecer como bottom sheet, menu radial simples ou menu flutuante.

---

# 10. HOME / RESUMO

A Home é a principal tela de visão operacional.

Ela não deve duplicar toda a informação existente nas outras páginas. Deve apresentar somente o que ajuda na tomada de decisão.

## 10.1 Cabeçalho

Título:

**Resumo**

Subtítulo opcional:

**Visão geral da operação**

---

# 11. CARDS DE RESUMO

Desktop deve apresentar quatro cards principais.

## Card 1 — Clientes

Exibir:

- ícone de clientes;
- total de clientes;
- quantidade concluída;
- indicador percentual opcional;
- microtexto de contexto.

Exemplo:

```text
Clientes
12
4 concluídos
```

## Card 2 — Tarefas

Exibir:

- total de tarefas;
- tarefas concluídas;
- percentual opcional.

## Card 3 — Pendentes

Exibir:

- total de tarefas pendentes;
- indicação de atenção.

## Card 4 — Concluídas

Exibir:

- total concluído;
- percentual do total.

### Regras

Todos os números precisam ser calculados a partir dos dados reais.

Não utilizar números estáticos.

---

# 12. RESUMO DE CLIENTES

A Home deve mostrar uma lista compacta dos clientes mais recentes ou relevantes.

### Estrutura

```text
Clientes Recentes                       Ver todos →
---------------------------------------------------
Avatar | Nome | Serviço | Prioridade | Status
```

Cada item deve apresentar:

- avatar ou iniciais;
- nome;
- informação secundária, como serviço;
- indicador de prioridade;
- status;
- acesso ao detalhe.

O botão **Ver todos** deve navegar diretamente para `/clientes`.

---

# 13. RESUMO DE TAREFAS

A Home deve apresentar as tarefas mais recentes, próximas do vencimento ou prioritárias.

Cada item deve mostrar:

- checkbox;
- nome da tarefa;
- cliente relacionado;
- prazo;
- prioridade;
- status.

Botão **Ver todas** direciona para `/tarefas`.

---

# 14. PÁGINA CLIENTES

Rota sugerida:

```text
/clientes
```

## 14.1 Cabeçalho

Elementos:

- título `Clientes`;
- descrição curta;
- campo de busca;
- filtro de status;
- filtro de prioridade;
- botão `+ Adicionar Cliente`.

---

# 15. LISTAGEM DE CLIENTES

Desktop deve utilizar uma tabela ou lista tabular responsiva.

Colunas obrigatórias:

1. Avatar
2. Nome
3. Número
4. Serviço
5. Preço
6. Prioridade
7. Status
8. Ações

### Exemplo

```text
Avatar | Nome | Número | Serviço | Preço | Prioridade | Status | Ações
```

---

# 16. DADOS DO CLIENTE

Objeto mínimo:

```ts
interface Client {
  id: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials?: string;
  priority: Priority;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}
```

## 16.1 Campos obrigatórios

### Nome

- obrigatório;
- mínimo recomendado: 2 caracteres;
- exibir trim automático;
- não aceitar somente espaços.

### Número

- obrigatório;
- deve aceitar somente formato telefônico válido;
- máscara recomendada no Brasil: `(99) 99999-9999`;
- guardar valor normalizado no banco.

### Serviço

- obrigatório;
- texto livre.

### Preço

- obrigatório;
- número decimal >= 0;
- exibição em BRL:

```text
R$ 150,00
```

### Avatar

Opcional.

Se não houver foto:

1. gerar iniciais automaticamente;
2. utilizar primeira letra do nome ou iniciais do nome e sobrenome;
3. mostrar fundo em verde suave.

---

# 17. PRIORIDADE DO CLIENTE

O cliente deve possuir exatamente uma prioridade.

Enum:

```ts
type Priority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'very-low';
```

Mapeamento visual:

```text
critical  → bandeira vermelha
high      → bandeira laranja
medium    → bandeira amarela
low       → bandeira roxa
very-low  → bandeira azul
```

A bandeira deve aparecer na listagem e na tela de detalhes.

Não usar somente a cor para representar prioridade: fornecer tooltip/label acessível.

---

# 18. STATUS DO CLIENTE

Estados mínimos:

```ts
type ClientStatus =
  | 'pending'
  | 'in-progress'
  | 'completed';
```

### Visual

| Status | Texto |
|---|---|
| pending | Pendente |
| in-progress | Em andamento |
| completed | Concluído |

O status deve ser mostrado por badge.

---

# 19. AÇÕES DO CLIENTE

Cada cliente deve possuir:

- visualizar;
- editar;
- marcar como concluído;
- remover.

## 19.1 Visualizar

Abrir página de detalhes ou drawer/modal.

## 19.2 Editar

Abrir formulário preenchido com todos os dados atuais.

## 19.3 Concluir

Ao concluir:

- status passa para `completed`;
- registrar `updatedAt`;
- atualizar contadores da Home;
- atualizar listas sem recarregar a página inteira.

## 19.4 Remover

Nunca remover imediatamente sem confirmação.

Exibir modal:

```text
Remover cliente?
Essa ação não poderá ser desfeita.

[Cancelar] [Remover]
```

O botão destrutivo deve utilizar vermelho.

---

# 20. FORMULÁRIO DE ADICIONAR CLIENTE

O formulário deve conter:

1. Upload de foto/avatar
2. Nome
3. Número
4. Serviço
5. Preço
6. Prioridade
7. Status inicial

### Status inicial

Por padrão:

```text
Pendente
```

### Botões

```text
Cancelar
Salvar Cliente
```

O botão primário deve ser Evergreen.

---

# 21. PÁGINA DE DETALHES DO CLIENTE

Deve apresentar:

- avatar grande;
- nome;
- serviço;
- número;
- preço;
- prioridade;
- status;
- data de criação;
- última atualização;
- ações.

Ações:

```text
Editar
Marcar como concluído
Remover
```

---

# 22. PÁGINA TAREFAS

Rota:

```text
/tarefas
```

## 22.1 Cabeçalho

Elementos:

- título `Tarefas`;
- busca;
- filtro de status;
- filtro de prioridade;
- filtro de cliente;
- ordenação;
- botão `+ Adicionar Tarefa`.

---

# 23. DADOS DA TAREFA

Objeto mínimo recomendado:

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  dueDate?: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

## 23.1 Status

```ts
type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed';
```

---

# 24. LISTAGEM DE TAREFAS

Desktop:

```text
Tarefa | Cliente | Prazo | Prioridade | Status | Ações
```

Mobile:

A tarefa deve ser transformada em card.

Cada card deve exibir:

- título;
- cliente;
- prioridade;
- prazo;
- status;
- checkbox;
- menu de ações.

---

# 25. AÇÕES DAS TAREFAS

Obrigatórias:

- adicionar;
- visualizar;
- editar;
- marcar como concluída;
- remover.

---

# 26. CHECKBOX DE CONCLUSÃO

O checkbox deve ser o mecanismo mais rápido para concluir tarefas.

Ao marcar:

1. atualizar status;
2. registrar `completedAt`;
3. atualizar Home;
4. atualizar contadores;
5. aplicar microanimação;
6. manter item visualmente identificável como concluído.

O item concluído pode reduzir levemente o contraste, mas nunca desaparecer imediatamente sem opção de visualização.

---

# 27. FORMULÁRIO DE ADICIONAR TAREFA

Campos:

- título;
- descrição;
- cliente relacionado;
- prazo;
- prioridade;
- status.

### Campos obrigatórios

Título e prioridade.

Cliente e prazo podem ser opcionais, mas o sistema deve suportar ambos.

---

# 28. PÁGINA DE DETALHES DA TAREFA

Exibir:

- ícone da tarefa;
- título;
- cliente relacionado;
- prioridade;
- status;
- prazo;
- descrição;
- criação;
- atualização.

Ações:

```text
Editar
Marcar como concluída
Remover tarefa
```

---

# 29. RELAÇÃO CLIENTE × TAREFA

Uma tarefa pode estar vinculada a um cliente.

Regra:

```text
Task.clientId → Client.id
```

No momento de excluir um cliente, o sistema deve perguntar o que fazer com suas tarefas vinculadas.

Opções recomendadas:

1. manter tarefas e remover vínculo;
2. cancelar/remover tarefas relacionadas.

A opção padrão deve ser **manter tarefas sem vínculo**, evitando perda de dados acidental.

---

# 30. PESQUISA

A busca deve funcionar em tempo real com debounce.

### Clientes

Pesquisar por:

- nome;
- telefone;
- serviço.

### Tarefas

Pesquisar por:

- título;
- descrição;
- nome do cliente.

Debounce recomendado:

```text
250–350ms
```

---

# 31. FILTROS

Filtros devem ser combináveis.

Exemplo:

```text
Status = Pendente
Prioridade = Alta
Cliente = Maria Silva
```

O resultado deve atender a todos os filtros selecionados.

Deve existir ação:

```text
Limpar filtros
```

---

# 32. ORDENAÇÃO

Clientes devem permitir ordenar por:

- nome;
- preço;
- prioridade;
- data de criação;
- status.

Tarefas devem permitir ordenar por:

- prazo;
- prioridade;
- data de criação;
- status.

Ordenação padrão das tarefas:

1. vencidas;
2. alta prioridade;
3. próximas do prazo;
4. demais.

---

# 33. RESPONSIVIDADE

Breakpoints recomendados:

```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## 33.1 Desktop

A partir de aproximadamente `1024px`:

- sidebar visível;
- tabelas completas;
- cards em grid;
- duas colunas na Home quando houver espaço.

## 33.2 Tablet

Entre `768px` e `1023px`:

- sidebar pode permanecer compacta ou virar drawer;
- cards reorganizados;
- tabelas podem converter para listas.

## 33.3 Mobile

Abaixo de `768px`:

- sidebar removida;
- bottom navigation fixa;
- cards em uma coluna;
- tabelas convertidas para cards;
- botões de ação maiores;
- touch target mínimo de aproximadamente 44×44px.

---

# 34. DESIGN MOBILE

A experiência mobile precisa ser tratada como uma interface própria, e não apenas uma versão desktop encolhida.

## 34.1 Header mobile

Elementos:

- menu ou voltar;
- título da página;
- busca quando necessário;
- avatar;
- sino quando necessário.

## 34.2 Home mobile

Ordem vertical:

1. Saudação
2. Cards de resumo
3. Clientes recentes
4. Tarefas recentes
5. Espaço inferior suficiente para a bottom navigation

---

# 35. BOTTOM NAVIGATION MOBILE

Itens:

```text
Home | Clientes | + | Tarefas | Mais
```

O item ativo recebe:

- ícone Sage Green/Evergreen;
- label;
- pequena indicação visual.

O botão central `+` deve possuir prioridade visual maior.

---

# 36. ÍCONES

Utilizar uma biblioteca consistente, por exemplo:

- Lucide Icons;
- Phosphor Icons;
- outra biblioteca equivalente.

Não misturar estilos diferentes.

Ícones devem possuir espessura uniforme.

Tamanhos recomendados:

```text
16px → tabelas
18px → botões
20px → navegação
24px → cards
28–32px → destaques
```

---

# 37. AVATARES

Prioridade de exibição:

1. foto enviada pelo usuário;
2. iniciais geradas automaticamente.

### Regra de iniciais

Para `Maria Silva`:

```text
MS
```

Para nome de uma palavra:

```text
M
```

As iniciais devem permanecer centralizadas.

---

# 38. TOASTS / NOTIFICAÇÕES

Após ações importantes, usar toast.

Exemplos:

```text
Cliente adicionado com sucesso.
Cliente atualizado com sucesso.
Cliente concluído.
Cliente removido.
Tarefa criada com sucesso.
Tarefa concluída.
Tarefa removida.
```

Toast deve aparecer no canto superior direito desktop e próximo ao topo/inferior acima da bottom nav no mobile.

Duração recomendada:

```text
3–4 segundos
```

---

# 39. ESTADOS DE LOADING

Não deixar a tela simplesmente vazia durante carregamento.

Utilizar skeleton loaders para:

- cards;
- listas;
- tabela;
- detalhes.

Skeleton deve respeitar o formato aproximado do conteúdo real.

---

# 40. ESTADOS VAZIOS

## Clientes sem registros

Mensagem:

```text
Nenhum cliente cadastrado
Adicione seu primeiro cliente para começar.

[+ Adicionar Cliente]
```

## Tarefas sem registros

```text
Nenhuma tarefa encontrada
Crie uma nova tarefa para começar.

[+ Adicionar Tarefa]
```

Não mostrar tabela vazia sem explicação.

---

# 41. ERROS DE FORMULÁRIO

Erros devem aparecer abaixo do campo e não somente em toast.

Exemplos:

```text
O nome é obrigatório.
Informe um telefone válido.
Informe um valor maior ou igual a R$ 0,00.
Selecione uma prioridade.
```

O campo inválido deve receber borda de erro.

---

# 42. CONFIRMAÇÃO DE AÇÕES DESTRUTIVAS

Sempre exigir confirmação para exclusão.

Nunca realizar exclusão silenciosa.

Modal deve conter:

- título;
- mensagem clara;
- cancelamento;
- ação destrutiva destacada.

---

# 43. ACESSIBILIDADE

Requisitos mínimos:

- contraste adequado;
- labels em todos os inputs;
- foco visível via teclado;
- navegação sem mouse possível;
- `aria-label` em ícones que atuam como botão;
- nunca depender exclusivamente de cor;
- tooltips para bandeiras de prioridade;
- checkbox acessível;
- tamanho de alvo touch mínimo de 44px;
- mensagens de erro associadas ao campo.

---

# 44. MICROINTERAÇÕES

A interface deve possuir animações sutis.

## 44.1 Hover de botão

- leve mudança de cor;
- deslocamento vertical de no máximo `-1px`;
- aumento discreto da sombra.

## 44.2 Hover de card

- sombra ligeiramente maior;
- elevação máxima de `2px`.

## 44.3 Conclusão de tarefa

Animação recomendada:

```text
checkbox aparece marcado
→ pequeno scale
→ ícone confirma
→ status muda
```

Duração:

```text
180–280ms
```

## 44.4 Entrada de modal

Usar:

- fade do backdrop;
- scale de 0.98 → 1;
- duração 180–220ms.

---

# 45. TRANSIÇÕES

Padrão:

```css
transition: all 180ms ease;
```

Para interações mais delicadas:

```css
transition: all 220ms cubic-bezier(0.22, 1, 0.36, 1);
```

Não utilizar animações longas para ações simples.

---

# 46. DARK MODE

O design principal especificado é claro.

Dark mode pode ser implementado em etapa futura, desde que não altere a experiência principal.

Caso seja implementado, preservar o Evergreen como referência cromática, mas ajustar superfícies e contraste.

---

# 47. ESTRUTURA DE COMPONENTES RECOMENDADA

Estrutura conceitual:

```text
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar
│   │   ├── MobileBottomNav
│   │   ├── Header
│   │   └── PageContainer
│   ├── ui/
│   │   ├── Button
│   │   ├── Badge
│   │   ├── Avatar
│   │   ├── Modal
│   │   ├── Toast
│   │   ├── Input
│   │   ├── Select
│   │   ├── Checkbox
│   │   └── Skeleton
│   ├── dashboard/
│   ├── clients/
│   └── tasks/
├── pages/
│   ├── Home
│   ├── Clients
│   ├── ClientDetails
│   ├── Tasks
│   └── TaskDetails
├── services/
├── hooks/
├── utils/
├── types/
└── assets/
```

Os nomes exatos podem variar conforme o framework, mas a separação de responsabilidades deve ser preservada.

---

# 48. ROTAS

Rotas sugeridas:

```text
/                       → Home
/clientes               → Lista de clientes
/clientes/:id           → Detalhes do cliente
/tarefas                → Lista de tarefas
/tarefas/:id            → Detalhes da tarefa
/configuracoes          → Configurações
```

---

# 49. MODELO DE DADOS

## Client

```ts
interface Client {
  id: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials: string;
  priority: Priority;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}
```

## Task

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  dueDate?: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

# 50. REGRAS DE NEGÓCIO

## Cliente concluído

Quando um cliente for marcado como concluído:

```text
status = completed
```

Não alterar automaticamente o status das tarefas relacionadas.

## Tarefa concluída

Ao concluir:

```text
status = completed
completedAt = current timestamp
```

## Cliente removido

Não apagar tarefas automaticamente por padrão.

## Preço

O preço deve ser armazenado como número, nunca como string formatada.

Exemplo correto:

```text
150.00
```

Exibição:

```text
R$ 150,00
```

## Datas

Armazenar em formato padronizado, preferencialmente ISO 8601.

Exemplo:

```text
2026-08-18T19:00:00-03:00
```

---

# 51. FORMATAÇÃO DE DADOS

## Moeda

```text
R$ 1.250,50
```

## Telefone

```text
(32) 99876-5432
```

## Data

Preferência:

```text
18/08/2026
```

## Data relativa

Na interface pode utilizar:

```text
Hoje
Amanhã
Ontem
```

Caso a tarefa tenha prazo vencido:

```text
Vencida
```

com destaque visual apropriado.

---

# 52. PRIORIDADE E ORDENAÇÃO VISUAL

A prioridade máxima deve sempre possuir maior destaque sem tornar a interface agressiva.

Ordem:

```text
1. Vermelho — máxima
2. Laranja — alta
3. Amarelo — média
4. Roxo — baixa
5. Azul — muito baixa
```

Na classificação numérica interna, quanto menor o número, maior a prioridade:

```text
1 = critical
2 = high
3 = medium
4 = low
5 = very-low
```

---

# 53. TABELAS DESKTOP

As tabelas devem:

- possuir header fixo visualmente distinto;
- usar linhas com espaçamento confortável;
- manter alinhamento vertical central;
- evitar excesso de linhas divisórias;
- destacar a primeira coluna de texto;
- deixar ações alinhadas à direita.

As colunas devem ter largura flexível e não quebrar informação crítica desnecessariamente.

---

# 54. CARDS MOBILE

Cada cliente mobile deve ocupar um card individual.

Estrutura:

```text
┌──────────────────────────────┐
│ Avatar  Nome             ⋮   │
│         Serviço              │
│         Telefone             │
│         R$ 150,00            │
│         Status       Flags   │
└──────────────────────────────┘
```

Cada tarefa mobile:

```text
┌──────────────────────────────┐
│ 🚩 Título              □     │
│ Cliente                     │
│ Prioridade                   │
│ Prazo                        │
└──────────────────────────────┘
```

---

# 55. MENU DE AÇÕES

No mobile, para evitar excesso de botões, utilizar menu `⋮`.

Opções:

```text
Visualizar
Editar
Marcar como concluído
Remover
```

A ação de remover deve ser visualmente separada e vermelha.

---

# 56. MODAIS

Os modais devem:

- possuir backdrop escurecido;
- bloquear interação com o conteúdo ao fundo;
- fechar com ESC;
- fechar por botão `X`;
- fechar ao clicar fora apenas quando não houver ação destrutiva pendente;
- possuir foco inicial adequado.

No mobile, formulários grandes podem ser apresentados como **bottom sheet** ou página inteira.

---

# 57. PERFORMANCE

A implementação deve evitar renders desnecessários.

Requisitos:

- debounce na pesquisa;
- paginação ou virtualização caso a quantidade de registros cresça significativamente;
- lazy loading para imagens;
- compressão de avatar;
- evitar dependências desnecessárias;
- evitar animações pesadas que bloqueiem main thread.

---

# 58. IMAGENS E AVATARES

Uploads devem:

- aceitar JPG, PNG e WebP;
- verificar tamanho máximo;
- gerar preview local;
- permitir substituição;
- tratar falha de carregamento;
- possuir fallback para iniciais.

Recomendação:

```text
máximo de 2–5 MB por arquivo enviado
```

Se houver backend, redimensionar imagens antes de armazenar quando possível.

---

# 59. SEGURANÇA

Mesmo sendo uma aplicação administrativa, devem ser considerados:

- validação no frontend e backend;
- sanitização de texto;
- autorização para ações destrutivas;
- proteção de endpoints;
- não confiar nos dados enviados pelo cliente;
- não armazenar senhas em texto puro;
- logs de ações críticas quando necessário.

---

# 60. FEEDBACK VISUAL

Toda ação deve ter resposta clara.

| Ação | Feedback |
|---|---|
| Adicionar | toast + item aparece |
| Editar | toast + atualização da linha/card |
| Concluir | microanimação + badge atualizado |
| Remover | toast + item desaparece |
| Busca | resultado atualizado |
| Filtro | contador/lista atualizada |
| Erro | mensagem contextual |

---

# 61. DESIGN SYSTEM MÍNIMO

Criar componentes reutilizáveis para evitar inconsistência.

Componentes obrigatórios:

- Button
- IconButton
- Input
- Select
- SearchInput
- Badge
- PriorityFlag
- Avatar
- Checkbox
- Modal
- Drawer
- Toast
- Card
- EmptyState
- Skeleton
- Table
- Pagination, caso necessária

---

# 62. BOTÕES

## Primário

```text
background: #243119
color: #FFFFFF
```

Hover:

```text
background: #31441F
```

## Secundário

Fundo claro, borda verde e texto Evergreen.

## Ghost

Sem fundo, sem borda forte.

## Danger

Vermelho para ações destrutivas.

---

# 63. ESTADOS DOS BOTÕES

Todo botão deve possuir:

- default;
- hover;
- active;
- focus;
- disabled;
- loading, quando houver operação assíncrona.

Durante loading:

- desabilitar interação;
- exibir spinner;
- preservar largura do botão.

---

# 64. ESTADOS DOS INPUTS

Cada input deve possuir:

- default;
- hover;
- focus;
- error;
- disabled;
- filled.

O foco deve ser claramente visível.

---

# 65. PAGINAÇÃO

Se os dados crescerem significativamente, adicionar paginação.

Configuração sugerida:

```text
20 itens por página
```

Mas a primeira versão pode funcionar com carregamento completo caso o volume seja pequeno.

---

# 66. CONEXÃO COM BACKEND

A UI deve ser desenvolvida de modo que a camada visual não dependa diretamente do banco de dados.

Recomendação:

```text
UI
 ↓
Hooks / State
 ↓
Service Layer
 ↓
API
 ↓
Backend
 ↓
Database
```

Evitar chamadas API diretamente espalhadas por dezenas de componentes.

---

# 67. ENDPOINTS REST SUGERIDOS

## Clientes

```http
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PUT    /api/clients/:id
PATCH  /api/clients/:id/status
DELETE /api/clients/:id
```

## Tarefas

```http
GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
PATCH  /api/tasks/:id/status
DELETE /api/tasks/:id
```

Os endpoints são uma recomendação e podem ser adaptados à arquitetura final.

---

# 68. HOME — CÁLCULOS

A Home deve calcular dinamicamente:

### Clientes

```text
totalClients
completedClients
pendingClients
clientCompletionRate
```

### Tarefas

```text
totalTasks
completedTasks
pendingTasks
inProgressTasks
overdueTasks
taskCompletionRate
```

### Exemplos

```ts
clientCompletionRate = completedClients / totalClients * 100

taskCompletionRate = completedTasks / totalTasks * 100
```

Tratar divisão por zero.

---

# 69. FORMATAÇÃO DO PERCENTUAL

Exibir números inteiros quando a precisão decimal não for relevante.

Exemplo:

```text
33%
37%
40%
```

Não exibir:

```text
33.333333%
```

---

# 70. FILTRO DE TAREFAS VENCIDAS

Uma tarefa é vencida quando:

```text
dueDate < now
AND status !== completed
```

Visualmente, apresentar sinalização de atenção.

Não alterar automaticamente a cor da prioridade.

---

# 71. DATA ATUAL

A interface deve utilizar a data real do dispositivo ou servidor, conforme a arquitetura escolhida.

Nunca fixar a data exibida nos mockups.

---

# 72. RESPONSIVIDADE DOS CARDS DA HOME

Desktop:

```text
4 cards em linha
```

Tablet:

```text
2 × 2
```

Mobile:

```text
1 × 4
```

---

# 73. RESPONSIVIDADE DOS BLOCOS DE RESUMO

Desktop:

```text
Clientes recentes | Tarefas recentes
```

Tablet:

```text
Clientes recentes
Tarefas recentes
```

Mobile:

```text
Clientes recentes
Tarefas recentes
```

Sempre em uma única coluna no smartphone.

---

# 74. ESTILO DOS CARDS

Cards devem utilizar:

- fundo branco;
- borda sutil;
- sombra suave;
- radius 18px;
- padding 20–24px;
- hierarquia tipográfica clara.

Evitar gradientes fortes.

Gradientes podem ser utilizados de forma muito sutil em áreas decorativas da Home.

---

# 75. FUNDO DA APLICAÇÃO

O fundo geral deve ser levemente esverdeado:

```text
#F7FAF5
```

Isso evita o aspecto excessivamente clínico de um fundo branco puro.

Cards permanecem predominantemente brancos.

---

# 76. SIDEBAR VISUAL

A sidebar deve ser a área mais escura da interface para criar contraste estrutural.

```text
#243119
```

Logo e navegação devem ter aparência elegante, não excessivamente brilhante.

---

# 77. HEADER DECORATIVO

Opcionalmente, a Home pode possuir uma área superior com formas orgânicas muito sutis em verde claro.

Essas formas não podem:

- prejudicar a leitura;
- aumentar muito o DOM;
- distrair do conteúdo;
- interferir em controles.

---

# 78. MOBILE — PADRÃO DE ESPAÇAMENTO

Padding lateral recomendado:

```text
16px
```

Cards:

```text
16px
```

Gap vertical:

```text
12–16px
```

Bottom navigation deve reservar espaço extra no conteúdo para não esconder itens.

---

# 79. MOBILE — BOTÕES

Botões principais devem ter altura mínima de aproximadamente:

```text
48px
```

Botões secundários:

```text
44px
```

---

# 80. MOBILE — FORMULÁRIOS

Inputs devem ocupar 100% da largura disponível.

Evitar formulário em múltiplas colunas.

Uma coluna é o padrão.

O botão de salvar pode ficar fixado na parte inferior quando o formulário for longo, respeitando a área da navegação.

---

# 81. MOBILE — DETALHES DO CLIENTE

Ordem de conteúdo:

1. botão voltar;
2. avatar;
3. nome;
4. serviço;
5. dados principais;
6. prioridade;
7. status;
8. datas;
9. ações.

---

# 82. MOBILE — DETALHES DA TAREFA

Ordem:

1. voltar;
2. ícone da tarefa;
3. título;
4. cliente;
5. prioridade;
6. status;
7. prazo;
8. descrição;
9. ações.

---

# 83. ACESSIBILIDADE DAS BANDEIRAS

Não usar somente:

```text
vermelho
laranja
amarelo
roxo
azul
```

Também fornecer texto acessível:

```text
Prioridade máxima
Prioridade alta
Prioridade média
Prioridade baixa
Prioridade muito baixa
```

---

# 84. ACESSIBILIDADE DOS STATUS

Badge deve conter texto, por exemplo:

```text
Pendente
Em andamento
Concluído
```

A cor é somente reforço visual.

---

# 85. TESTES OBRIGATÓRIOS

A equipe deve testar:

### Clientes

- criar;
- editar;
- concluir;
- remover;
- cancelar remoção;
- upload de avatar;
- fallback de iniciais;
- filtros;
- busca;
- ordenação.

### Tarefas

- criar;
- editar;
- concluir;
- remover;
- buscar;
- filtrar;
- ordenar;
- associar cliente;
- tarefa sem cliente;
- tarefa vencida.

### Responsividade

Testar pelo menos:

```text
375px
390px
414px
768px
1024px
1280px
1440px
1920px
```

---

# 86. CRITÉRIOS DE ACEITE — HOME

A Home só deve ser considerada concluída quando:

- os cards refletem dados reais;
- clientes recentes são exibidos corretamente;
- tarefas recentes são exibidas corretamente;
- links `Ver todos` funcionam;
- layout funciona em desktop e mobile;
- não existem números hardcoded;
- loading e estado vazio estão implementados.

---

# 87. CRITÉRIOS DE ACEITE — CLIENTES

Considerar concluído quando:

- é possível adicionar cliente;
- editar cliente;
- remover cliente;
- concluir cliente;
- visualizar detalhes;
- pesquisar;
- filtrar;
- ordenar;
- exibir avatar/fallback;
- prioridade funciona corretamente;
- status funciona corretamente;
- layout mobile funciona.

---

# 88. CRITÉRIOS DE ACEITE — TAREFAS

Considerar concluído quando:

- é possível adicionar tarefa;
- editar tarefa;
- remover tarefa;
- concluir tarefa;
- visualizar detalhes;
- relacionar cliente;
- filtrar;
- buscar;
- ordenar;
- identificar vencidas;
- funcionar corretamente no mobile.

---

# 89. CRITÉRIOS VISUAIS

A implementação deve manter os seguintes pontos do design:

- verde escuro como estrutura principal;
- fundo claro esverdeado;
- cards brancos;
- tipografia limpa;
- rounded corners;
- sombras suaves;
- bandeiras coloridas por prioridade;
- avatares circulares;
- bottom nav no mobile;
- sidebar no desktop;
- botões primários Evergreen;
- grande área de respiro;
- aparência premium e profissional.

---

# 90. O QUE NÃO FAZER

Não implementar:

- excesso de cores;
- gradients fortes;
- sombras pesadas;
- bordas excessivamente grossas;
- cards gigantes sem necessidade;
- fontes decorativas;
- ícones inconsistentes;
- tabelas ilegíveis em mobile;
- ações destrutivas sem confirmação;
- estados somente por cor;
- números estáticos na Home;
- layouts que dependam de largura fixa no mobile.

---

# 91. ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

## Fase 1 — Fundação

- setup do projeto;
- tokens de design;
- tipografia;
- componentes base;
- layout principal;
- navegação.

## Fase 2 — Clientes

- modelagem;
- listagem;
- criação;
- edição;
- detalhes;
- remoção;
- conclusão.

## Fase 3 — Tarefas

- modelagem;
- listagem;
- criação;
- edição;
- detalhes;
- conclusão;
- remoção.

## Fase 4 — Home

- cálculos;
- cards;
- clientes recentes;
- tarefas recentes;
- indicadores.

## Fase 5 — Responsividade

- tablet;
- mobile;
- bottom navigation;
- cards mobile;
- formulários mobile.

## Fase 6 — Refinamento

- animações;
- loading;
- skeleton;
- toasts;
- acessibilidade;
- estados vazios;
- tratamento de erros.

## Fase 7 — QA

- testes funcionais;
- testes responsivos;
- testes de acessibilidade;
- testes de performance;
- validação visual com o mockup.

---

# 92. DEFINIÇÃO DE PRONTO

A plataforma só deve ser considerada pronta quando:

1. todas as operações CRUD exigidas estiverem funcionando;
2. clientes e tarefas estiverem relacionados corretamente;
3. os dados da Home forem derivados dos dados reais;
4. a interface desktop estiver consistente com o design;
5. a interface mobile estiver consistente com o design mobile;
6. os estados de loading, erro e vazio existirem;
7. as ações destrutivas tiverem confirmação;
8. a prioridade estiver corretamente representada pelas cinco bandeiras;
9. acessibilidade básica estiver implementada;
10. nenhuma informação crítica estiver hardcoded;
11. não existirem erros de console relacionados à aplicação;
12. a experiência estiver visualmente consistente em diferentes resoluções.

---

# 93. REFERÊNCIA VISUAL

Os mockups produzidos para este projeto devem ser usados como **referência visual de composição**, não como fonte de dados.

A equipe deve seguir rigorosamente:

- hierarquia;
- proporções aproximadas;
- composição dos blocos;
- paleta;
- espaçamentos;
- lógica de navegação;
- estrutura desktop;
- estrutura mobile;
- comportamento de prioridade;
- aparência geral premium.

Os textos, quantidades de clientes, datas, preços e tarefas exibidos no mockup são apenas exemplos e devem ser substituídos por dados reais da aplicação.

---

# 94. NOTA FINAL PARA A EQUIPE

O objetivo não é somente criar uma aplicação funcional. A implementação deve preservar a **mesma sensação visual e de uso do conceito aprovado**.

Sempre que houver conflito entre uma implementação rápida e uma implementação que preserve o design system, priorizar o design system, a consistência e a experiência do usuário.

A interface deve parecer um produto SaaS profissional pronto para uso comercial, e não um protótipo acadêmico ou painel administrativo genérico.

---

# 95. CHECKLIST FINAL DO DESENVOLVEDOR

- [ ] Paleta implementada via tokens/variáveis.
- [ ] Tipografia implementada.
- [ ] Sidebar desktop implementada.
- [ ] Bottom navigation mobile implementada.
- [ ] Home implementada.
- [ ] CRUD de clientes implementado.
- [ ] CRUD de tarefas implementado.
- [ ] Detalhes de cliente implementados.
- [ ] Detalhes de tarefa implementados.
- [ ] Sistema de prioridade implementado.
- [ ] Sistema de status implementado.
- [ ] Busca implementada.
- [ ] Filtros implementados.
- [ ] Ordenação implementada.
- [ ] Avatar/fallback implementado.
- [ ] Confirmação de exclusão implementada.
- [ ] Toasts implementados.
- [ ] Skeleton/loading implementados.
- [ ] Empty states implementados.
- [ ] Validação dos formulários implementada.
- [ ] Responsividade testada.
- [ ] Acessibilidade básica validada.
- [ ] Performance validada.
- [ ] Sem dados críticos hardcoded.
- [ ] Sem erros críticos no console.
- [ ] Revisão visual final realizada.

---

**Fim da especificação — GestorPro v1.0**
