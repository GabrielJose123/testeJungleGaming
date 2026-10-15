/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o servidor simulado (MSW) — padrão em desenvolvimento e no build de demonstração. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Base das rotas REST (padrão "/api"). */
  readonly VITE_API_URL?: string
  /** Origem do Socket.IO (padrão: a própria origem da página). */
  readonly VITE_SOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
