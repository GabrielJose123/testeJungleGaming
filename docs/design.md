# Design técnico — camada de dados

Este documento define os contratos entre transporte (REST + Socket.IO), estado (TanStack Query) e
interface. A fonte de verdade dos tipos é [`src/api/types.ts`](../src/api/types.ts): este texto descreve
o comportamento e as decisões. Os mocks (MSW) implementam exatamente esses contratos.

## 1. Convenções gerais

| Item | Decisão |
| --- | --- |
| Base REST | `VITE_API_URL` (padrão `/api`) |
| Formato | JSON, `camelCase`, datas ISO-8601 UTC |
| Valores monetários | **strings decimais em ETH** (`"1.19"`, `"0.0021"`), até 18 casas, nunca `number` |
| Cálculos | `decimal.js` (servidor simulado). O cliente **não recalcula** totais: exibe a cotação da API |
| Quantidades | inteiros ≥ 1 |
| Autenticação | `Authorization: Bearer <token>` |
| Carrinho de visitante | `X-Cart-Id: <uuid>` gerado e persistido pelo cliente |
| Idempotência | `Idempotency-Key: <uuid>` obrigatório em `POST /orders` |
| Versionamento | todo recurso mutável tem `version: number` (incrementa a cada mudança) |

### Envelope de erro

```json
{
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "A edição 1/10 de Emerald Ape #042 está esgotada.",
    "status": 409,
    "retryable": false,
    "fieldErrors": { "quantity": "Máximo de 2 unidades" },
    "details": {}
  }
}
```

| Status | Códigos | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `COUPON_INVALID`, `COUPON_EXPIRED`, `CART_EMPTY`, `INVALID_CURRENT_PASSWORD`, `AVATAR_INVALID`, `IDEMPOTENCY_KEY_REQUIRED` | Entrada inválida; `fieldErrors` mapeia campo → mensagem |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | Sem sessão, sessão expirada ou credenciais erradas |
| 403 | `FORBIDDEN`, `WALLET_REJECTED` | Recurso de outro usuário; conexão de carteira recusada |
| 404 | `NOT_FOUND`, `NFT_NOT_FOUND`, `ORDER_NOT_FOUND`, `QUOTE_NOT_FOUND`, `ROUTE_NOT_FOUND` | Recurso inexistente |
| 409 | `EMAIL_TAKEN`, `OUT_OF_STOCK`, `EDITION_UNAVAILABLE`, `QUANTITY_LIMIT`, `QUOTE_STALE`, `QUOTE_EXPIRED`, `IDEMPOTENCY_CONFLICT`, `WALLET_ROLE_TAKEN`, `WALLET_DUPLICATE`, `WALLET_NOT_CONNECTED` | Conflito com o estado atual |
| 500 | `INTERNAL_ERROR` | Falha inesperada (`retryable: true`) |
| 503 | `SERVICE_UNAVAILABLE` | Falha transitória (`retryable: true`) |
| — | `NETWORK_ERROR`, `TIMEOUT`, `CANCELED` | Gerados **no cliente** pelo Axios (sem resposta HTTP) |

## 2. Contratos REST

Tipos citados abaixo estão em `src/api/types.ts`. 🔒 = exige sessão.

### Sessão e conta

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `POST /auth/register` | `RegisterRequest { name, email, password, guestCartId? }` | `201 SessionResponse` | 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN` |
| `POST /auth/login` | `LoginRequest { email, password, guestCartId? }` | `200 SessionResponse` | 400, 401 `INVALID_CREDENTIALS` |
| `GET /auth/session` 🔒 | — | `200 SessionResponse` | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED` |
| `POST /auth/logout` 🔒 | — | `204` | — (idempotente) |

`SessionResponse = { token, expiresAt, user: User }`. A sessão dura 30 minutos (fixo). Login e cadastro
com `guestCartId` **mesclam** o carrinho do visitante no carrinho do usuário (somando quantidades,
limitadas pela disponibilidade) e descartam o carrinho de visitante.

Senhas: o servidor simulado guarda apenas `PBKDF2-SHA256(senha, salt, 100 000 iterações)`. Nenhuma
senha em claro é persistida no cliente nem no banco simulado.

### NFTs

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `GET /nfts` | query `NftListParams` | `200 NftPage` | 400 |
| `GET /nfts/:id` | — | `200 NftDetail` | 404 `NFT_NOT_FOUND` |

`NftListParams`: `q`, `collections` (csv), `networks` (csv), `minPrice`, `maxPrice` (decimais), `sort`
(`recent` \| `price-asc` \| `price-desc` \| `name-asc`), `tab` (`all` \| `new` \| `trending`), `page`
(1-based), `pageSize` (padrão 9, máx. 48). Filtros são combináveis (AND entre grupos, OR dentro do grupo).

`NftPage = { items: NftSummary[], page, pageSize, total, totalPages, facets }`. `facets` traz contagem por
coleção e rede **considerando os demais filtros**, além da faixa de preço global.

`NftDetail` acrescenta descrição, atributos, avaliação, galeria e `editions: Edition[]`. Cada edição tem
`priceEth`, `available`, `maxPerOrder` e `status` (`available` \| `sold-out` \| `unavailable`).

### Favoritos 🔒

| Método e rota | Response | Erros |
| --- | --- | --- |
| `GET /favorites` | `200 { nftIds: string[] }` | 401 |
| `PUT /favorites/:nftId` | `204` | 401, 404 |
| `DELETE /favorites/:nftId` | `204` | 401 |

`PUT`/`DELETE` são idempotentes.

### Carrinho (visitante ou usuário)

Identidade: sessão (`Authorization`) tem prioridade; sem sessão, usa `X-Cart-Id`.

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `GET /cart` | — | `200 Cart` | — |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | `200 Cart` | 400, 404, 409 `OUT_OF_STOCK` / `EDITION_UNAVAILABLE` / `QUANTITY_LIMIT` |
| `PATCH /cart/items/:itemId` | `{ quantity }` | `200 Cart` | 400, 404, 409 |
| `DELETE /cart/items/:itemId` | — | `200 Cart` | 404 |
| `PUT /cart/coupon` | `{ code }` | `200 Cart` | 400 `COUPON_INVALID` / `COUPON_EXPIRED` |
| `DELETE /cart/coupon` | — | `200 Cart` | — |

`Cart = { id, items, coupon, summary, version, updatedAt }`. Cada `CartItem` traz o **preço atual**
(`unitPriceEth`), o preço no momento da inclusão (`addedUnitPriceEth`), a disponibilidade atual e
`issues` (`PRICE_CHANGED`, `OUT_OF_STOCK`, `QUANTITY_EXCEEDS_AVAILABLE`, `EDITION_UNAVAILABLE`).
`summary: PriceSummary = { subtotalEth, discountEth, networkFeeEth, totalEth }` é calculado no servidor
com a rede padrão (Ethereum).

### Cotação 🔒

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `POST /quotes` | `{ network, couponCode? }` | `201 Quote` | 400 `CART_EMPTY` / `COUPON_*`, 409 `OUT_OF_STOCK` / `QUANTITY_LIMIT` |

`Quote = { id, cartVersion, network, items (snapshot), coupon, summary, createdAt, expiresAt }`.
Validade: 5 minutos. É a **única referência de valores** para criar o pedido.

Regras de cálculo (implementadas em `src/mocks/domain/pricing.ts` e cobertas por testes):

- `subtotal = Σ unitPrice × quantity`
- cupom `percent`: `discount = subtotal × value / 100`, arredondado para 6 casas (`ROUND_HALF_UP`);
  cupom `fixed`: `discount = min(value, subtotal)`
- `networkFee` por rede de pagamento: Ethereum `0.0021`, Polygon `0.0004`, Solana `0.0002`
- `total = subtotal − discount + networkFee`

### Pedidos 🔒

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `POST /orders` | header `Idempotency-Key`; body `CreateOrderRequest { quoteId, walletId, network, collector }` | `201 Order` (nova) ou `200 Order` (repetição) | 400, 404 `QUOTE_NOT_FOUND`, 409 `QUOTE_STALE` (com `details.quote` atualizada) / `QUOTE_EXPIRED` / `OUT_OF_STOCK` / `IDEMPOTENCY_CONFLICT` / `WALLET_NOT_CONNECTED` |
| `GET /orders/:id` | — | `200 Order` | 403 `FORBIDDEN`, 404 `ORDER_NOT_FOUND` |
| `GET /orders?status=pending` | — | `200 { items: Order[] }` | 401 |

**Idempotência:** o servidor guarda `(userId, key) → (hash do payload, orderId)`.

- mesma chave + mesmo payload → devolve o **mesmo** pedido (`200`), sem efeitos duplicados;
- mesma chave + payload diferente → `409 IDEMPOTENCY_CONFLICT`;
- chave nova → valida a cotação contra o catálogo atual. Se preço, disponibilidade, cupom ou taxa
  mudaram, responde `409 QUOTE_STALE` com a cotação recalculada, e o usuário precisa confirmar de novo.

**Ciclo de vida:** `pending → confirmed | rejected`. Os dois finais são **terminais**. Na confirmação, o
servidor baixa o estoque (emitindo `nft.updated`) e remove do carrinho **apenas** os itens e quantidades
comprados. Em recusa, o carrinho fica intacto. O pedido guarda um **snapshot** de itens, valores, cupom,
carteira e coletor: mudanças posteriores no catálogo não alteram o recibo. `transaction.hash` e
`explorerUrl` são simulados.

### Perfil 🔒

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `GET /profile` | — | `200 Profile` | 401 |
| `PATCH /profile` | `{ name?, email?, bio? }` | `200 Profile` | 400, 409 `EMAIL_TAKEN` |
| `PUT /profile/avatar` | `{ dataUrl }` (PNG/JPEG/WebP, ≤ 1 MB) | `200 Profile` | 400 `AVATAR_INVALID` |
| `POST /profile/password` | `{ currentPassword, newPassword }` | `204` | 400 `VALIDATION_ERROR` / `INVALID_CURRENT_PASSWORD` |

### Carteiras 🔒

| Método e rota | Request | Response | Erros |
| --- | --- | --- | --- |
| `GET /wallets` | — | `200 { items: Wallet[] }` | 401 |
| `POST /wallets` | `{ label, address, network, role }` | `201 Wallet` | 400, 409 `WALLET_ROLE_TAKEN` / `WALLET_DUPLICATE` |
| `PATCH /wallets/:id` | campos parciais | `200 Wallet` | 400, 403, 404, 409 |
| `POST /wallets/:id/connect` | — | `200 Wallet` (`connection: "connected"`) | 403 `WALLET_REJECTED` |
| `POST /wallets/:id/disconnect` | — | `200 Wallet` | 404 |

`role`: `primary` ou `secondary` (no máximo uma de cada). Endereço: `0x` + 40 hex (Ethereum/Polygon) ou
base58 de 32–44 caracteres (Solana).

## 3. Eventos Socket.IO

Conexão: `socket.io-client` com `transports: ["websocket"]`, `auth: { token }` (ou sem token para
visitantes, que recebem apenas eventos públicos). O servidor associa o socket ao usuário e só entrega
`order.updated` aos sockets **daquele** usuário.

```ts
interface RealtimeEvent<TType, TResource, TData> {
  eventId: string            // UUID estável: duplicatas têm o mesmo eventId
  type: TType
  resource: { type: TResource; id: string }
  version: number            // versão do recurso após a mudança
  occurredAt: string
  data: TData                // estado completo relevante (não um delta)
}
```

| Evento | `resource` | `data` | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | `nft` | `{ priceEth, previousPriceEth, available, editions[] }` | Atualiza detalhe e listas no cache; invalida carrinho; marca a cotação ativa como desatualizada; registra aviso acessível |
| `order.updated` | `order` | `{ userId, status, previousStatus, transaction, failureReason }` | Atualiza o pedido no cache; em `confirmed`, invalida carrinho e catálogo |

**Regras do cliente** (`src/realtime/event-gate.ts`):

1. `eventId` já visto → descarta (duplicata; lista limitada aos 500 mais recentes).
2. `version ≤` última versão conhecida do recurso (pelo evento **ou** pelo REST) → descarta (evento antigo).
3. `order.updated` com `userId` diferente do usuário atual → descarta (sessão anterior).
4. Na reconexão, invalida os recursos ativos (catálogo, detalhes abertos, carrinho, pedidos pendentes)
   para reconciliar com o REST. O REST sempre vence em caso de dúvida.
5. Listeners são registrados por hook e removidos no unmount; o socket é desconectado no logout ou na
   troca de usuário e recriado com o novo token.

## 4. Estado no cliente (TanStack Query)

### Query keys

```ts
["session"]
["nfts", "list", NftListParams]
["nfts", "detail", nftId]
["private", scope, "cart"]               // scope = userId | `guest:${cartId}`
["private", userId, "favorites"]
["private", userId, "orders", orderId]
["private", userId, "orders", "pending"]
["private", userId, "profile"]
["private", userId, "wallets"]
```

Todo dado privado fica sob `["private", scope, …]`. Isolamento por usuário: a chave carrega o escopo, e no
logout ou na troca de usuário **todo** o prefixo `["private"]` é removido (`removeQueries`), além de
cancelar requisições em andamento.

### Política de cache e retry

| Dado | `staleTime` | Observação |
| --- | --- | --- |
| Catálogo | 30 s | `placeholderData: keepPreviousData` na paginação |
| Detalhe | 30 s | Atualizado também por `nft.updated` |
| Carrinho | 0 | Sempre revalida ao montar; atualizado pelas mutations (resposta = carrinho novo) |
| Favoritos, perfil, carteiras | 60 s | |
| Pedido pendente | 0 | Polling de 5 s **somente** enquanto `pending` (fallback do socket) |
| Sessão | 5 min | |

- **Retry de queries:** até 2 tentativas, só para erros `retryable` (rede, timeout, 5xx), com backoff
  exponencial (500 ms → 1 s → 2 s, máximo 4 s). Erros 4xx nunca são repetidos.
- **Retry de mutations:** desligado por padrão. `POST /orders` repete até 2 vezes em `NETWORK_ERROR` ou
  `TIMEOUT` **com a mesma `Idempotency-Key`**, então a repetição nunca cria outro pedido.
- **Cancelamento:** toda `queryFn` repassa o `signal` ao Axios. Respostas fora de ordem não sobrescrevem
  dados novos porque cada combinação de parâmetros tem sua própria chave, e a requisição abandonada é
  abortada.
- **Timeout do Axios:** 10 s.

### Invalidação

| Gatilho | Invalida / atualiza |
| --- | --- |
| Mutations de carrinho | `setQueryData(cart)` com a resposta |
| Favoritar (otimista) | `onMutate` aplica, `onError` faz rollback, `onSettled` invalida favoritos |
| Pedido criado | adiciona em `orders/pending`; inicia acompanhamento |
| `order.updated` confirmado | pedido, `orders/pending`, carrinho, catálogo |
| `nft.updated` | detalhe (`setQueryData` se a versão for maior), listas, carrinho |
| Perfil ou carteiras alterados | `setQueryData` com a resposta |
| Login, logout, troca de usuário | `removeQueries(["private"])`; reconexão do socket |

## 5. Fluxo de sessão

1. **Boot:** lê `kurio:session` do `localStorage`. Se existir e não estiver vencida, a sessão é otimista
   e `GET /auth/session` a confirma em segundo plano.
2. **Login ou cadastro:** envia `guestCartId`. Ao receber a sessão: persiste o token, limpa o cache privado,
   apaga o `X-Cart-Id` (o carrinho foi mesclado) e reconecta o socket com o novo token.
3. **Rotas privadas** (`/pagamento`, `/pedidos/$orderId`, `/perfil`, `/carteiras`): `beforeLoad` redireciona
   para `/entrar?redirect=<rota atual>` quando não há sessão. Depois do login, volta para `redirect`.
4. **Expiração:** qualquer `401 SESSION_EXPIRED` ou `UNAUTHENTICATED` com token presente dispara
   `expireSession()`: limpa a sessão, o cache privado e o socket, e envia o usuário a
   `/entrar?redirect=…&reason=expired`. O contexto do checkout (rascunho do formulário, carteira e rede)
   fica em `sessionStorage` e é restaurado na volta. O carrinho já vive no servidor.
5. **Logout:** `POST /auth/logout` (melhor esforço), depois a mesma limpeza da expiração.

## 6. Carrinho

- O carrinho vive **no servidor simulado**. O cliente guarda apenas o `X-Cart-Id` do visitante, e isso
  basta para sobreviver a refresh.
- No login, o servidor mescla o carrinho do visitante no do usuário.
- A UI exibe `summary` vindo da API. Mudanças recebidas por socket invalidam o carrinho, e `issues`
  explicam o que mudou (preço, esgotado, quantidade acima do disponível).

## 7. Checkout e pedido idempotente

```text
Carrinho ─► POST /quotes ─► revisão ─► confirmar
                 ▲                         │ Idempotency-Key = chave da tentativa (sessionStorage)
                 │                         ▼
     409 QUOTE_STALE ◄──────────── POST /orders ──► 201/200 Order(pending)
     (nova cotação, nova                    │
      confirmação)                          ▼
                              order.updated (socket) / GET /orders/:id (polling)
                                            │
                              confirmed ─► recibo │ rejected ─► mensagem + carrinho intacto
```

- A chave de idempotência é gerada **por tentativa de confirmação** (cotação + carteira + rede + dados) e
  guardada em `sessionStorage`. Clique repetido reaproveita a mesma mutation em andamento (botão
  desabilitado) e, mesmo que dispare de novo, usa a mesma chave.
- **Timeout após criar:** o Axios aborta, a mutation repete com a mesma chave e o servidor devolve o mesmo
  pedido.
- O `id` do pedido pendente fica em `localStorage` (`kurio:pending-order:<userId>`). Depois de refresh ou
  reconexão, o app retoma o acompanhamento via `GET /orders/:id` e o socket.
- A confirmação só é exibida para `status === "confirmed"` vindo da API ou do evento.
- Uma `nft.updated` que afete um item da cotação ativa marca a cotação como desatualizada. O botão de
  confirmar exige gerar e revisar uma nova cotação.

## 8. Cenários simulados

Selecionados por `?scenario=<nome>` (persistido em `localStorage` até `?scenario=default`). `?reset=1`
restaura o banco inicial. Detalhes em [`src/mocks/scenarios.ts`](../src/mocks/scenarios.ts).

| Cenário | Efeito |
| --- | --- |
| `default` | Latência determinística de 150–400 ms |
| `slow` | 2,5 s em toda requisição (skeletons) |
| `variable-latency` | 100–2000 ms com semente fixa: provoca respostas fora de ordem |
| `empty` | Catálogo sem resultados |
| `server-error` | `500` em todas as rotas de leitura do catálogo |
| `flaky` | `503` na 1ª tentativa de cada requisição de leitura; a 2ª passa (testa retry) |
| `offline` | Erro de rede em todas as requisições |
| `timeout` | Requisições de leitura não respondem (estoura o timeout do cliente) |
| `session-expired` | Rotas autenticadas respondem `401 SESSION_EXPIRED` |
| `price-changed` | Ao criar o pedido, o preço do 1º item sobe 10% (`409 QUOTE_STALE` + `nft.updated`) |
| `sold-out` | Ao criar o pedido, a edição do 1º item esgota (`409 OUT_OF_STOCK` + `nft.updated`) |
| `payment-declined` | O pedido vai para `rejected` |
| `order-timeout` | O pedido é criado, mas a 1ª resposta não chega (timeout); a repetição recupera o mesmo pedido |
| `wallet-rejected` | `POST /wallets/:id/connect` responde `403 WALLET_REJECTED` |

Dados fixos: 48 NFTs, 2 usuários (`ana@kurio.dev` e `bruno@kurio.dev`, senha `Kurio@123`), cupons
`KURIO10` (10%), `BEMVINDO` (0.05 ETH) e `EXPIRADO` (vencido).
