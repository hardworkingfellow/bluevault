import React, { useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { CoinIcon } from './AssetCard.jsx'
import { getWalletDetails } from '../data/walletAddresses.js'

const fieldClass = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'

export default function ReceiveModal({ assets, initialAsset, user, assignedAddress = '', assignedAsset = 'USDT', assignedNetwork = '', onClose }) {
  const [ticker, setTicker] = useState(initialAsset?.ticker || assignedAsset)
  const [copied, setCopied] = useState(false)
  const asset = assets.find(item => item.ticker === ticker) || assets[0]
  const wallet = user
    ? getWalletDetails(user, asset?.ticker)
    : ticker === assignedAsset
      ? { address: assignedAddress, network: assignedNetwork }
      : { address: '', network: '' }
  const copy = async () => {
    if (!wallet.address) return
    try { await navigator.clipboard.writeText(wallet.address) } catch { /* Clipboard permissions can be unavailable in preview. */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="surface animate-in w-full max-w-[440px] rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Receive crypto</h2><p className="muted mt-1 text-xs">Choose an asset to view its assigned deposit address.</p></div><button aria-label="Close dialog" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-soft)]"><X size={18}/></button></div><label className="mb-4 block"><span className="mb-2 block text-xs font-semibold">Asset</span><select value={asset?.ticker || ''} onChange={event => { setTicker(event.target.value); setCopied(false) }} className={fieldClass}>{assets.map(item => <option key={item.ticker} value={item.ticker}>{item.name} ({item.ticker})</option>)}</select></label>{asset && <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-soft)] p-3"><CoinIcon asset={asset}/><span className="min-w-0 flex-1"><span className="block font-semibold">{asset.name} <span className="muted font-normal">· {asset.ticker}</span></span><span className="muted mt-1 block text-xs">{wallet.network || 'Network not assigned'}</span></span></div>}{wallet.address ? <><p className="muted mb-2 mt-5 text-xs">Admin-assigned wallet address</p><p className="break-all rounded-xl bg-[var(--surface-soft)] p-3 font-mono text-xs leading-relaxed">{wallet.address}</p><button onClick={copy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">{copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>} {copied ? 'Address copied' : 'Copy address'}</button><p className="muted mt-3 text-center text-[10px]">Only send {asset?.ticker} on {wallet.network || 'the assigned network'}.</p></> : <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] px-5 py-9 text-center"><p className="text-sm font-semibold">No receive address assigned</p><p className="muted mx-auto mt-1.5 max-w-xs text-xs leading-relaxed">Your admin needs to upload a wallet address before you can receive {asset?.ticker || 'crypto'}.</p></div>}</section></div>
}
