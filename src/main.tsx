/**
 * Ponto de entrada. Os mocks (MSW) precisam subir ANTES de qualquer módulo do app:
 * o engine.io-client captura o construtor `WebSocket` ao ser avaliado, e o interceptador
 * do MSW só substitui o `WebSocket` global no `worker.start()`. Por isso o app inteiro é
 * carregado com import dinâmico depois dos mocks.
 */
async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "true") return
  const { startMocks } = await import("./mocks/browser")
  await startMocks()
}

await enableMocks()
const { mount } = await import("./bootstrap")
mount(document.getElementById("root")!)
