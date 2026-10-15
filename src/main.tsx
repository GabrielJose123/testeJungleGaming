/**
 * Ponto de entrada. O app e os mocks (MSW) são baixados em paralelo, mas o app só é montado
 * depois de `worker.start()`: nenhuma requisição sai antes de o servidor simulado estar pronto.
 * O engine.io-client captura o construtor `WebSocket` ao ser avaliado, por isso o
 * socket.io-client é importado sob demanda (src/realtime/realtime-client.ts), já com os mocks ativos.
 */
async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "true") return
  const { startMocks } = await import("./mocks/browser")
  await startMocks()
}

const [{ mount }] = await Promise.all([import("./bootstrap"), enableMocks()])
mount(document.getElementById("root")!)
