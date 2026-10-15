# Arquitetura

Visão geral das decisões do frontend Kurio. Os contratos completos (rotas, payloads, códigos de erro,
query keys) estão em [`docs/design.md`](docs/design.md); aqui fica o resumo, o porquê das escolhas,
as limitações e os desvios do Figma.

## 1. Camadas

```text
UI (features/*, components/*)
  │  hooks tipados
  ▼
TanStack Query (api/hooks/*) ◄──── realtime/* (Socket.IO: eventos aplicados no cache)
  │  queryFn / mutationFn com AbortSignal
  ▼
Axios (api/client.ts) ── Bearer token | X-Cart-Id ── 401 → expireSession()
  │
  ▼
REST /api/*  e  WebSocket /realtime   ← em dev e no demo, respondidos pelo MSW (src/mocks)
```

- **Contratos únicos** em `src/api/types.ts`, usados pelo cliente **e** pelo servidor simulado: se um lado
  muda o formato, o typecheck quebra o outro.
- **Dinheiro:** ETH trafega como string decimal (`"1.19"`), nunca `number`. Somas, descontos e taxas usam
  `decimal.js` (precisão de 18 casas) em `src/lib/money.ts`; a UI só formata. Isso evita erros de
  ponto flutuante (`0.1 + 0.2`) em totais exibidos e cobrados.
- **Servidor simulado** (`src/mocks`): banco em `localStorage`, regras de domínio (preço, estoque,
  cupom, cotação, pedido) separadas dos handlers HTTP, e cenários de falha selecionáveis pela URL.
  O app inicia os mocks **antes** de carregar o restante (`main.tsx` → `import("./bootstrap")`), porque
  o `engine.io-client` captura o `WebSocket` global no momento em que é avaliado.

## 2. Contratos REST e eventos (resumo)

| Recurso | Rotas | Observações |
| --- | --- | --- |
| Sessão | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/session` | Login envia o `guestCartId` para mesclar o carrinho do visitante |
| NFTs | `GET /nfts` (filtros, ordenação, aba, paginação, facetas), `GET /nfts/:id` | Respostas com `version` por NFT |
| Favoritos 🔒 | `GET /favorites`, `PUT/DELETE /favorites/:nftId` | Atualização otimista com rollback |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `PUT/DELETE /cart/coupon` | Visitante via `X-Cart-Id`; toda mutation devolve o carrinho inteiro com `summary` e `issues` |
| Cotação 🔒 | `POST /quotes` `{ network }` | Congela itens, preços, cupom e taxa da rede por um tempo limitado |
| Pedidos 🔒 | `POST /orders` (header `Idempotency-Key`), `GET /orders/:id`, `GET /orders?status=pending` | `409 QUOTE_STALE` devolve a nova cotação |
| Perfil 🔒 | `GET/PATCH /profile`, `PUT /profile/avatar`, `POST /profile/password` | |
| Carteiras 🔒 | `GET/POST /wallets`, `PATCH /wallets/:id`, `POST /wallets/:id/connect`, `/disconnect` | Uma principal por usuário; conexão pode ser recusada |

Erros seguem um envelope único `{ error: { code, message, fieldErrors?, retryable, details? } }`; o
cliente converte tudo em `ApiError` (`src/api/errors.ts`), incluindo `NETWORK_ERROR`, `TIMEOUT` e
`CANCELED`, e as telas mostram `fieldErrors` no campo correspondente.

**Eventos Socket.IO** (path `/realtime`, `auth: { token }`):

| Evento | Quem recebe | Conteúdo |
| --- | --- | --- |
| `nft.updated` | todos | estado completo de preço, estoque e edições |
| `order.updated` | só o dono do pedido | `status`, transação ou motivo da recusa |

Todo evento tem `eventId` (estável entre duplicatas), `resource { type, id }`, `version` e `occurredAt`.

## 3. Política de sessão

- Token em `localStorage` (`kurio:session`) com `expiresAt` (30 min no servidor simulado). Um timer
  expira a sessão localmente no horário; o evento `storage` sincroniza login e logout entre abas.
- No boot a sessão salva é usada de forma otimista e confirmada por `GET /auth/session`.
- Rotas privadas (`/pagamento`, `/pedidos/:id`, `/perfil`, `/carteiras`) ficam sob o layout `_auth`, cujo
  `beforeLoad` redireciona para `/entrar?redirect=<rota>`. O `redirect` é validado (`safeRedirect`: só
  caminhos internos) para evitar open redirect.
- Um `401 SESSION_EXPIRED/UNAUTHENTICATED` **do token atual** dispara `expireSession()`: limpa sessão,
  cache privado e socket e leva para `/entrar?reason=expired&redirect=…`. Respostas atrasadas de um token
  antigo são ignoradas, para não derrubar uma sessão nova.
- O rascunho do checkout (dados do colecionador, carteira, rede) fica em `sessionStorage` e é
  restaurado quando o usuário volta do login.
- Senhas: o servidor simulado guarda só hash PBKDF2-SHA256 com salt; o cliente nunca persiste senha.

## 4. Estado do carrinho

- O carrinho é **do servidor**. O cliente guarda apenas o id do carrinho de visitante
  (`kurio:guest-cart-id`), suficiente para sobreviver a refresh.
- No login/cadastro o servidor mescla o carrinho do visitante no do usuário (somando quantidades até o
  limite por pedido e o estoque) e o cliente descarta o id de visitante.
- Toda mutation devolve o carrinho completo, que substitui o cache (`setQueryData`): sem cálculo de
  total no cliente. Subtotal, desconto, taxa e total vêm prontos em `summary`.
- Cada item traz `issues` (`PRICE_CHANGED`, `OUT_OF_STOCK`, `QUANTITY_EXCEEDS_AVAILABLE`,
  `EDITION_UNAVAILABLE`). A UI mostra o motivo no item e bloqueia o checkout enquanto houver um
  impedimento (mudança de preço só avisa).

## 5. Estratégia de cache

- **Chaves:** dados públicos em `["nfts", …]`; tudo que é privado em `["private", escopo, …]`, onde o
  escopo é o `userId` (ou `guest:<cartId>`). Na troca de identidade (login, logout, expiração, troca de
  usuário) o prefixo `["private"]` inteiro é removido e as requisições em andamento são canceladas:
  nenhum dado de um usuário aparece para outro.
- **staleTime:** catálogo e detalhe 30 s; favoritos, perfil e carteiras 60 s; carrinho 0; pedido
  pendente 0 com polling de 5 s **só enquanto `pending`** (fallback do socket).
- **Retry:** queries repetem até 2 vezes, com backoff, apenas erros `retryable` (rede, timeout, 5xx);
  4xx nunca. Mutations não repetem, exceto `POST /orders` em falha de transporte, sempre com a mesma
  `Idempotency-Key`.
- **Cancelamento e corrida:** toda `queryFn` repassa o `signal` ao Axios. Cada combinação de filtros tem
  sua chave, então uma resposta atrasada de filtros antigos nunca sobrescreve a lista atual. A paginação
  usa `keepPreviousData` para não piscar.
- **Filtros na URL:** os search params do catálogo são validados com Zod (valores inválidos caem no
  padrão) e serializados em CSV legível. Trocar filtro volta para a página 1.

## 6. Pedido idempotente

- A `Idempotency-Key` é gerada **por tentativa de confirmação** (cotação + carteira + rede + dados) e
  guardada em `sessionStorage`. Repetir o clique ou repetir após timeout reaproveita a mesma chave; o
  servidor devolve o mesmo pedido (mesma chave com payload diferente → `409`).
- Se o preço ou o estoque mudou desde a cotação, o servidor responde `409 QUOTE_STALE` com a cotação nova;
  a UI mostra os novos valores e exige uma nova confirmação.
- O pedido nasce `pending`. A confirmação na tela só aparece quando a API (REST ou `order.updated`) diz
  `confirmed`; nunca de forma otimista. O id do pedido pendente fica em `localStorage` para retomar o
  acompanhamento após refresh.

## 7. Reconciliação REST × Socket.IO

1. **Dedupe:** `eventId` já processado é descartado (janela dos últimos 500).
2. **Versão:** evento com `version` ≤ à última conhecida do recurso (vinda do socket **ou** do REST) é
   descartado. Isso cobre eventos fora de ordem e replays antigos.
3. **Escopo:** `order.updated` de outro usuário (sessão anterior) é ignorado.
4. **Aplicação:** `nft.updated` atualiza o detalhe e as listas no cache, invalida o carrinho e marca como
   desatualizada a cotação aberta que contém o NFT. `order.updated` atualiza o pedido e, se confirmado,
   invalida carrinho e catálogo.
5. **Reconexão:** ao reconectar (ou focar a aba) o cliente invalida os recursos ativos e busca de novo via
   REST. Em caso de dúvida o REST vence.
6. **Ciclo de vida:** um socket por identidade; logout ou troca de usuário fecha e recria com o novo
   token. Listeners são registrados por hook e removidos no unmount.
7. **Acessibilidade:** mudanças de preço e estoque vindas do socket são anunciadas numa região
   `aria-live`.

## 8. Decisões de UX

- Skeletons com shimmer reservam o espaço do conteúdo (catálogo, detalhe, carrinho, checkout, perfil,
  carteiras, pedido) para reduzir layout shift.
- Estados de erro sempre com mensagem em português e "Tentar novamente" quando faz sentido.
- Botões de ação ficam desabilitados durante a mutation (evita clique duplo) e mudam o texto
  ("Adicionando…", "Enviando pedido…").
- Quantidade limitada ao menor entre estoque e máximo por pedido; edições esgotadas ficam riscadas e
  desabilitadas.
- Favoritar sem login leva ao login e volta para o NFT.
- Login e cadastro são páginas (`/entrar`, `/cadastro`) com `redirect`, não modais: podem ser abertas por
  link, recarregadas e usadas pela guarda de rotas.
- No mobile, Detalhe e Pagamento escondem a tab bar e usam barra de ação fixa no rodapé.

## 9. Desvios do Figma

O plano gratuito do MCP do Figma esgotou a cota mensal no meio da implementação. A Início foi feita a
partir do contexto completo do Figma; as outras telas foram feitas a partir das capturas e da
estrutura exportadas antes do limite (`docs/figma-export/`). Por isso:

| Tela | Fonte usada | Desvios conhecidos |
| --- | --- | --- |
| Início | contexto completo (desktop e mobile) | Hero sem o SVG de fundo (bloco `surface-card` com raio 24); card "Golden Pulse #121" inventado para completar o grid; gaps de 6 px padronizados; blog em grid fluido; tablet (768–1023) interpolado |
| Detalhe | captura desktop + mobile | Mobile aproximado (o frame mobile não pôde ser lido); avaliações em texto simples; carrossel "Mais desta coleção" sem os pontos de paginação |
| Carrinho | captura desktop + mobile | Coluna "Edições" mostra o seletor de quantidade, como no Figma; o rótulo da edição foi para baixo do nome |
| Pagamento | captura mobile + estrutura | Desktop montado sem captura; lista de "Carteira e rede" mostra **redes** (Ethereum/Polygon/Solana) em vez de WalletConnect/MetaMask/Coinbase, porque a taxa da API depende da rede; inclui o formulário de dados do colecionador e o resumo exigidos pela especificação |
| Confirmação | estrutura | Painel montado a partir da hierarquia do frame (título, metadados, tabela); sem a ilustração "thank-you" |
| Login | captura desktop + mobile | Página própria em vez de modal sobre a Início; "Esqueceu a senha?" e login social são decorativos (fora do escopo) |
| Cadastro | captura mobile | Desktop segue o painel do Login |
| Perfil | captura desktop | Campos "Nome de usuário", "Nome ENS" e "Apelido da carteira" substituídos por "Bio" (o contrato de perfil tem nome, e-mail, bio e avatar); "Remover avatar" omitido; itens do menu fora do escopo (Atividade, Ofertas…) desabilitados |
| Carteiras | estrutura | Cards no estilo do Pagamento + formulário de cadastro/edição (rede, função principal/secundária) |

Outros: a cor `danger` (#E5654B) não existe no Figma e foi criada para erros; a marca exibida é
"KURIO" como no arquivo. Tokens em [`docs/design-tokens.md`](docs/design-tokens.md).

## 10. Limitações

- **Servidor na aba:** o MSW roda dentro de cada aba. Os dados são compartilhados via `localStorage`,
  mas eventos de socket não cruzam abas; o cliente compensa revalidando ao focar.
- **Socket simulado:** só transporte WebSocket (sem long-polling), sem rooms/acks; o binding do MSW não
  envia ping, então o servidor simulado envia a cada 20 s. Detalhes em `docs/design.md` §3.
- **Pedidos pendentes** dependem de timers da página; ao recarregar, os vencidos são liquidados e os
  demais reagendados.
- **Peso do demo:** o chunk dos mocks (~176 kB gzip) e as artes PNG (~2 MB cada) pesam no Lighthouse
  mobile. Num backend real os mocks saem do bundle (`npm run build`); as artes deveriam ser servidas em
  WebP redimensionado.
- **Testes:** o E2E cobre o fluxo de fumaça (catálogo → detalhe, atualização de preço via socket) em
  desktop e mobile; os fluxos de falha estão documentados no README para reprodução manual.
- **Sem OAuth, recuperação de senha nem blockchain real:** hashes de transação e conexões de carteira
  são simulados.
