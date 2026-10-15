async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "true") return
  const { startMocks } = await import("./mocks/browser")
  await startMocks()
}

const [{ mount }] = await Promise.all([import("./bootstrap"), enableMocks()])
mount(document.getElementById("root")!)
