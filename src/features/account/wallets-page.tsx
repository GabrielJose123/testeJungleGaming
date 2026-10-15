import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useConnectWallet, useCreateWallet, useDisconnectWallet, useUpdateWallet, useWallets } from "@/api/hooks/account"
import { NETWORKS, type CreateWalletRequest, type Network, type Wallet } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { OutlineButton, PrimaryButton, Shimmer, TextField } from "@/components/kit"
import { errorMessage } from "@/lib/error-message"
import { cn } from "@/lib/utils"
import { NETWORK_LABELS, shortAddress } from "@/lib/wallet-format"

import { AccountLayout } from "./account-layout"

const emptyWallet: CreateWalletRequest = { label: "", address: "", network: "ethereum", role: "secondary" }

/** Figma: Desktop / Carteiras (9:1670) — lista, cadastro/edição, principal e conexão simulada. */
export function WalletsPage() {
  const wallets = useWallets()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const [editing, setEditing] = useState<Wallet | "new" | null>(null)

  return (
    <AccountLayout active="wallets" title="Carteiras">
      {wallets.isPending && (
        <div role="status" aria-label="Carregando carteiras" className="flex flex-col gap-4">
          <Shimmer className="h-[92px]" />
          <Shimmer className="h-[92px]" />
        </div>
      )}
      {wallets.isError && <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />}
      {wallets.data?.items.length === 0 && <p className="text-body text-sand">Nenhuma carteira cadastrada.</p>}
      <ul className="flex flex-col gap-4">
        {wallets.data?.items.map((wallet) => (
          <li key={wallet.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-card px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-body-lg font-bold text-cream">
                {wallet.label}
                {wallet.role === "primary" && <span className="ml-2 rounded-full border border-brand px-2 py-0.5 text-caption font-normal text-amber">principal</span>}
              </span>
              <span className="text-body text-sand" title={wallet.address}>
                {shortAddress(wallet.address)}
              </span>
              <span className="text-body text-sand">
                Rede {NETWORK_LABELS[wallet.network]} ·{" "}
                <span className={wallet.connection === "connected" ? "text-success" : "text-brand-muted"}>{wallet.connection === "connected" ? "conectada" : "desconectada"}</span>
              </span>
            </div>
            <div className="flex gap-3">
              <OutlineButton onClick={() => setEditing(wallet)}>Editar</OutlineButton>
              {wallet.connection === "connected" ? (
                <OutlineButton disabled={disconnect.isPending} onClick={() => disconnect.mutate(wallet.id)}>
                  Desconectar
                </OutlineButton>
              ) : (
                <PrimaryButton disabled={connect.isPending} onClick={() => connect.mutate(wallet.id)}>
                  {connect.isPending && connect.variables === wallet.id ? "Conectando…" : "Conectar"}
                </PrimaryButton>
              )}
            </div>
          </li>
        ))}
      </ul>
      {(connect.isError || disconnect.isError) && (
        <p role="alert" className="text-body text-danger">
          {errorMessage(connect.error ?? disconnect.error)}
        </p>
      )}

      {editing ? (
        <WalletForm key={editing === "new" ? "new" : editing.id} wallet={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <PrimaryButton className="self-start" onClick={() => setEditing("new")}>
          Adicionar carteira
        </PrimaryButton>
      )}
    </AccountLayout>
  )
}

function WalletForm({ wallet, onDone }: { wallet: Wallet | null; onDone: () => void }) {
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const mutation = wallet ? update : create
  const [values, setValues] = useState<CreateWalletRequest>(wallet ? { label: wallet.label, address: wallet.address, network: wallet.network, role: wallet.role } : emptyWallet)
  const fieldErrors = isApiError(mutation.error) ? mutation.error.fieldErrors : {}
  const selectClass = "h-10 w-full rounded-xs border border-line-soft bg-ink px-3 text-body text-cream focus-visible:border-brand focus-visible:outline-none"

  return (
    <form
      noValidate
      aria-labelledby="wallet-form-title"
      className="grid gap-6 rounded-3xl border border-line p-6 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (wallet) update.mutate({ id: wallet.id, ...values }, { onSuccess: onDone })
        else create.mutate(values, { onSuccess: onDone })
      }}
    >
      <h2 id="wallet-form-title" className="text-body-lg font-bold text-cream lg:col-span-2">
        {wallet ? "Editar carteira" : "Nova carteira"}
      </h2>
      <TextField label="Apelido da carteira" required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} error={fieldErrors.label} />
      <TextField label="Endereço" required spellCheck={false} value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} error={fieldErrors.address} />
      <label className="flex flex-col gap-3 text-body text-cream">
        Rede
        <select value={values.network} onChange={(event) => setValues({ ...values, network: event.target.value as Network })} className={selectClass}>
          {NETWORKS.map((network) => (
            <option key={network} value={network}>
              {NETWORK_LABELS[network]}
            </option>
          ))}
        </select>
        {fieldErrors.network && <span className="text-caption text-danger">{fieldErrors.network}</span>}
      </label>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-body text-cream">Função</legend>
        <div className="flex gap-6">
          {(["primary", "secondary"] as const).map((role) => (
            <label key={role} className={cn("flex items-center gap-2 text-body", values.role === role ? "text-amber" : "text-sand")}>
              <input type="radio" name="role" checked={values.role === role} onChange={() => setValues({ ...values, role })} className="accent-brand" />
              {role === "primary" ? "Principal" : "Secundária"}
            </label>
          ))}
        </div>
        {fieldErrors.role && <span className="text-caption text-danger">{fieldErrors.role}</span>}
      </fieldset>
      {mutation.isError && !Object.keys(fieldErrors).length && (
        <p role="alert" className="text-body text-danger lg:col-span-2">
          {errorMessage(mutation.error)}
        </p>
      )}
      <div className="flex gap-3 lg:col-span-2">
        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <OutlineButton onClick={onDone}>Cancelar</OutlineButton>
      </div>
    </form>
  )
}
