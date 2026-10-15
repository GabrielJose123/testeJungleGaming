import { useConnectWallet, useDisconnectWallet, useWallets } from "@/api/hooks/account"
import { ErrorState, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/error-message"

/** Carteiras provisória: lista e conexão simulada. Cadastro/edição chegam com o layout do Figma. */
export function WalletsPage() {
  const wallets = useWallets()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()

  return (
    <ScreenPlaceholder title="Carteiras" nav="home">
      {wallets.isPending && <LoadingState />}
      {wallets.isError && <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />}
      {wallets.data?.items.length === 0 && <p>Nenhuma carteira cadastrada.</p>}
      <ul className="flex flex-col gap-3">
        {wallets.data?.items.map((wallet) => (
          <li key={wallet.id} className="flex flex-col gap-1">
            <span className="text-cream">
              {wallet.label} — {wallet.role === "primary" ? "principal" : "secundária"} ({wallet.network})
            </span>
            <span className="break-all">{wallet.address}</span>
            {wallet.connection === "connected" ? (
              <Button size="sm" variant="outline" className="self-start" onClick={() => disconnect.mutate(wallet.id)}>
                Desconectar
              </Button>
            ) : (
              <Button size="sm" className="self-start" onClick={() => connect.mutate(wallet.id)}>
                Conectar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {connect.isError && (
        <p role="alert" className="text-danger">
          {errorMessage(connect.error)}
        </p>
      )}
    </ScreenPlaceholder>
  )
}
