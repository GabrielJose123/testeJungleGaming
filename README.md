# Kurio — marketplace de NFTs

Frontend do desafio **GreenMint / Kurio**: catálogo, detalhe, carrinho, checkout com carteira, pedido
idempotente com confirmação em tempo real, login, cadastro, perfil e carteiras. Não há backend real:
toda a API REST e o Socket.IO são simulados no navegador com **MSW**, então o projeto roda a partir de
um checkout limpo, sem serviços externos.

**Stack:** React 19 · TypeScript · Vite · TanStack Router (rotas por arquivo) · TanStack Query ·
Axios · Socket.IO client · Tailwind CSS v4 · shadcn/ui · decimal.js · Zod · MSW 2 ·
Vitest · Playwright · Lighthouse.

Decisões técnicas, contratos e desvios do Figma: [`ARCHITECTURE.md`](ARCHITECTURE.md).
Contratos REST e eventos em detalhe: [`docs/design.md`](docs/design.md).

## Requisitos

- Node.js **20.19+** (testado com Node 24)
- npm 10+

## Setup

```bash
npm ci
npx playwright install chromium   # só para os testes E2E e o Lighthouse
npm run dev                       # http://localhost:5173
```

Os mocks já vêm ligados em desenvolvimento (`.env.development`). Não é preciso criar `.env`.

## Variáveis de ambiente

Veja [`.env.example`](.env.example). Para sobrescrever localmente, copie para `.env.local`.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` em `dev` e `build:demo` | Liga o servidor simulado (MSW: REST + Socket.IO) |
| `VITE_API_URL` | `/api` | Base das rotas REST |
| `VITE_SOCKET_URL` | origem da página | Origem do Socket.IO (path `/realtime`) |

`npm run build` gera o build **sem** mocks (`VITE_ENABLE_MOCKS` não definido), para apontar para uma
API real. O deploy usa `npm run build:demo` (`.env.demo`), que mantém os mocks ligados.

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana Souza | `ana@kurio.dev` | `Kurio@123` |
| Bruno Lima | `bruno@kurio.dev` | `Kurio@123` |

As senhas ficam no banco simulado só como hash PBKDF2-SHA256 (100 mil iterações, com salt). Também é
possível criar uma conta em `/cadastro`.

**Cupons:** `KURIO10` (10%), `BEMVINDO` (0,05 ETH) e `EXPIRADO` (vencido, para testar o erro).

A carteira "MetaMask principal" da Ana começa **desconectada**: conecte-a no checkout ou em `/carteiras`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (Vite + MSW) |
| `npm run build` | Typecheck + build de produção (sem mocks) |
| `npm run build:demo` | Typecheck + build de demonstração (mocks ligados), usado no deploy |
| `npm run preview` | Serve o último build (`dist/`) |
| `npm run typecheck` | Gera a árvore de rotas e roda `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Vitest (cotação, idempotência, dedupe e versionamento de eventos) |
| `npm run test:e2e` | Playwright no Chromium, desktop (1440) e mobile (390); sobe o Vite na porta 5180 |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run test:e2e:report` | Abre o relatório HTML (`playwright-report/`) |
| `npm run lighthouse` | `build:demo` + `vite preview` + 3 medições por página e perfil (mobile/desktop) |

`npm run lighthouse -- --skip-build --runs=1` reaproveita o build e faz uma medição só. Os relatórios
(HTML/JSON por medição, `summary.md` e `summary.json` com medianas e ambiente) vão para
`lighthouse/reports/`. A configuração versionada está em `lighthouse/lighthouse.config.mjs`.

Para rodar o E2E contra outro ambiente (por exemplo, o deploy):
`E2E_BASE_URL=https://seu-deploy npm run test:e2e`.

## Cenários simulados

Selecione com `?scenario=<nome>` em qualquer URL. O cenário fica salvo no `localStorage` até
`?scenario=default`. Os parâmetros somem da barra de endereço depois de aplicados.

| Cenário | Efeito |
| --- | --- |
| `default` | Latência determinística de 150–400 ms |
| `slow` | 2,5 s em toda requisição (mostra os skeletons) |
| `variable-latency` | 100–2000 ms com semente fixa: respostas fora de ordem |
| `empty` | Catálogo sem resultados |
| `server-error` | `500` nas leituras do catálogo |
| `flaky` | `503` na 1ª tentativa de cada leitura; a repetição automática passa |
| `offline` | Erro de rede em todas as requisições |
| `timeout` | Leituras não respondem (estoura o timeout de 10 s do cliente) |
| `session-expired` | Rotas autenticadas respondem `401 SESSION_EXPIRED` |
| `price-changed` | Ao criar o pedido, o preço do 1º item sobe 10% (`409 QUOTE_STALE`) |
| `sold-out` | Ao criar o pedido, a edição do 1º item esgota |
| `payment-declined` | O pagamento é recusado (`order.updated` → `rejected`) |
| `order-timeout` | A 1ª resposta de criação do pedido não chega (testa a idempotência) |
| `wallet-rejected` | A conexão da carteira é recusada (`403 WALLET_REJECTED`) |

### Reset

- `?reset=1` restaura o banco inicial (NFTs, usuários, carrinhos, pedidos). Pode ser combinado:
  `/?reset=1&scenario=default`.
- `POST /api/__mock/reset` faz o mesmo de dentro da página (usado pelos testes).
- O banco simulado vive no `localStorage` (`kurio:mock-db`): limpar os dados do site também reseta.

### Controles de teste (`/api/__mock/*`)

Respondidos pelo MSW, ou seja, só funcionam com `fetch` feito **de dentro da página** (console do
navegador ou `page.evaluate` no Playwright):

| Rota | Efeito |
| --- | --- |
| `PUT /api/__mock/scenario` `{ "name": "slow" }` | Troca o cenário |
| `PATCH /api/__mock/nfts/:id` `{ "editionId", "priceEth", "available" }` | Muda preço/estoque e publica `nft.updated` |
| `POST /api/__mock/events/replay` `{ "mode": "duplicate" \| "stale" }` | Reenvia o último evento duplicado ou com versão antiga |
| `POST /api/__mock/socket/disconnect` | Derruba os sockets (o cliente reconecta e reconcilia via REST) |
| `POST /api/__mock/sessions/expire` | Expira todas as sessões |

## Como reproduzir os fluxos de falha

Entre como `ana@kurio.dev` antes dos fluxos de checkout.

| Fluxo | Passos | Resultado esperado |
| --- | --- | --- |
| Skeletons | Abra `/?scenario=slow` | Skeletons com shimmer no catálogo, detalhe, carrinho e perfil |
| Respostas fora de ordem | `/?scenario=variable-latency` e troque filtros e páginas rápido | A lista sempre corresponde aos filtros atuais da URL |
| Erro e retry | `/?scenario=server-error` | Mensagem de erro com "Tentar novamente" |
| Retry automático | `/?scenario=flaky` | O catálogo carrega depois de uma repetição silenciosa |
| Offline / timeout | `/?scenario=offline` ou `/?scenario=timeout` | Erro de conexão ou de tempo esgotado, com nova tentativa |
| Catálogo vazio | `/?scenario=empty` | Estado vazio no catálogo |
| Sessão expirada | Logado, em `/pagamento`, preencha o telefone e rode no console `fetch("/api/__mock/sessions/expire", { method: "POST" })`; depois clique em "Revisar pedido" | Volta para `/entrar` com aviso; depois do login retorna ao checkout com o formulário preenchido |
| Sessão expirada (todas as rotas) | Logado, abra `/perfil?scenario=session-expired` | Volta para `/entrar` com aviso (use `?scenario=default` antes de entrar de novo) |
| Rota protegida | Deslogado, abra `/perfil` | Redireciona para `/entrar?redirect=/perfil` e volta após o login |
| Preço mudou | Carrinho com itens → `/pagamento?scenario=price-changed` → revisar → confirmar | Aviso de valores alterados com a nova cotação; é preciso confirmar de novo |
| Esgotou | Mesmo fluxo com `?scenario=sold-out` | Erro de disponibilidade; o carrinho mostra o item como esgotado |
| Pagamento recusado | Mesmo fluxo com `?scenario=payment-declined` | Tela "Pagamento recusado"; os itens continuam no carrinho |
| Timeout na criação do pedido | Mesmo fluxo com `?scenario=order-timeout` | O cliente repete com a mesma `Idempotency-Key`: um único pedido é criado |
| Carteira recusada | `/pagamento?scenario=wallet-rejected` → "Conectar carteira" | Mensagem de conexão recusada |
| Preço em tempo real | Abra `/nft/emerald-ape-042` e, no console: `fetch("/api/__mock/nfts/emerald-ape-042", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ editionId: "1-50", priceEth: "1.45" }) })` | O preço muda sem recarregar e um aviso é anunciado (`aria-live`) |
| Evento duplicado / antigo | No console: `fetch("/api/__mock/events/replay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "stale" }) })` | O evento é ignorado (a tela não volta para o valor antigo) |
| Reconexão | No console: `fetch("/api/__mock/socket/disconnect", { method: "POST" })` | O socket reconecta e os dados são reconciliados via REST |
| Cupom vencido | No carrinho, aplique `EXPIRADO` | Erro no campo do cupom |

Volte ao normal com `?scenario=default` (e `?reset=1` para limpar os dados).

## Deploy (Vercel)

O [`vercel.json`](vercel.json) já está pronto: `npm ci`, `npm run build:demo`, saída em `dist/`, rewrite de
SPA (acesso direto e refresh em qualquer rota) e `mockServiceWorker.js` sem cache. Basta importar o
repositório na Vercel.

## Estrutura

```text
src/
  api/          contratos (types.ts), Axios, endpoints, query keys e hooks do TanStack Query
  checkout/     chaves de idempotência por tentativa e pedidos pendentes
  components/   layout (header, footer, tab bar), kit visual, cards, shadcn/ui
  features/     telas: home, nft, cart, checkout, auth, account
  lib/          dinheiro (decimal.js), serialização de search params, utilitários
  mocks/        servidor simulado: banco em localStorage, domínio, handlers REST, Socket.IO, cenários
  realtime/     cliente Socket.IO, portão de eventos (dedupe/versão), aplicação no cache, avisos
  routes/       rotas por arquivo do TanStack Router
  session/      sessão, expiração, sync entre abas, redirects
e2e/            Playwright
lighthouse/     configuração e relatórios do Lighthouse
docs/           especificação, design técnico, tokens e frames do Figma
```
