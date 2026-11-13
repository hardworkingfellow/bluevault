import React, { useState } from 'react'
import { Check, ChevronDown, Link2, Unlink, WalletCards, X } from 'lucide-react'

const networks = ['Ethereum', 'Bitcoin', 'Solana', 'BNB Smart Chain']
const field = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'

export default function ConnectWalletModal({ connectedAddress = '', connectedNetwork = 'Ethereum', onConnect, onDisconnect, onClose }) {
  const [address, setAddress] = useState(connectedAddress)
  const [network, setNetwork] = useState(connectedNetwork)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const submit = event => {
    event.preventDefault()
    const clean = address.trim()
    if (clean.length < 26 || clean.length > 100 || /\s/.test(clean)) return setError('Enter a valid wallet address without spaces.')
    if (network === 'Ethereum' && !/^0x[a-fA-F0-9]{40}$/.test(clean)) return setError('Enter a valid 42-character Ethereum address.')
    onConnect(clean, network)
    setError('')
    setDone(true)
  }
  const disconnect = () => { onDisconnect(); setAddress(''); setDone(false) }

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="surface animate-in w-full max-w-[460px] rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">{done ? <div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Check size={29}/></span><h2 className="mt-5 font-display text-xl font-bold">Wallet address connected</h2><p className="muted mx-auto mt-2 max-w-xs break-all text-sm leading-relaxed">{network} · {address}</p><p className="muted mt-3 text-xs">This saves the address to your profile. It does not connect to a wallet provider.</p><button onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">Done</button></div> : <><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Connect wallet address</h2><p className="muted mt-1 text-xs">Add an address to your profile.</p></div><button aria-label="Close dialog" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-soft)]"><X size={18}/></button></div>{connectedAddress && <div className="mb-4 flex min-w-0 items-start gap-3 rounded-xl bg-[var(--surface-soft)] p-3"><WalletCards className="mt-0.5 shrink-0 text-[var(--blue)]" size={17}/><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Currently connected · {connectedNetwork}</span><span className="muted mt-1 block break-all font-mono text-[10px]">{connectedAddress}</span></span><button onClick={disconnect} title="Disconnect wallet address" aria-label="Disconnect wallet address" className="muted rounded-lg p-1.5 transition hover:bg-[var(--surface)] hover:text-rose-500"><Unlink size={16}/></button></div>}<form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold">Network</span><span className="relative block"><select value={network} onChange={event => setNetwork(event.target.value)} className={`${field} appearance-none pr-10`}>{networks.map(item => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16}/></span></label><label className="block"><span className="mb-2 block text-xs font-semibold">Wallet address</span><input value={address} onChange={event => setAddress(event.target.value)} placeholder={network === 'Ethereum' ? '0x…' : 'Enter wallet address'} autoComplete="off" className={field}/></label>{error && <p role="alert" className="text-xs text-rose-500">{error}</p>}<button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"><Link2 size={17}/> {connectedAddress ? 'Update wallet address' : 'Connect address'}</button><p className="muted text-center text-[10px]">No wallet provider or blockchain connection is used.</p></form></>}</section></div>
}
