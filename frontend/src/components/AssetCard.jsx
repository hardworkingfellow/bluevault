import React from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { formatCurrency } from '../data/currencies.js'

export function CoinIcon({ asset, size = 'md' }) {
  const iconClass = size === 'lg' ? 'h-13 w-13' : 'h-11 w-11'
  const logo = {
    BTC: <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" aria-hidden="true"><path fill="white" d="M21.4 14.3c1.2-.8 1.8-2 1.6-3.5-.3-2.1-2.1-3.2-4.7-3.6V4.5h-2.1v2.6h-1.7V4.5h-2.1v2.7H7.8v2.5h1.7v12.6H7.8v2.5h4.6v2.7h2.1v-2.6h1.7v2.6h2.1v-2.8c3.4-.3 5.7-1.8 5.9-4.7.2-2.7-1.1-4.5-2.8-5.7Zm-7.5-4.1h2.4c1.8 0 2.8.6 2.8 1.9 0 1.4-1 2-2.9 2h-2.3v-3.9Zm2.9 11.6h-2.9v-4.5h2.8c2.2 0 3.3.7 3.3 2.2 0 1.6-1.1 2.3-3.2 2.3Z"/><path stroke="white" strokeWidth="1.25" d="M14.4 7.4V5.8m4 1.6V5.8m-4 20.4v-1.6m4 1.6v-1.6"/></svg>,
    ETH: <svg viewBox="0 0 32 32" className="h-[68%] w-[68%]" aria-hidden="true"><path fill="#343434" d="m16 2.5-8.3 13.8L16 20.2l8.3-3.9L16 2.5Z"/><path fill="#8C8C8C" d="m7.7 16.3 8.3 4v9.2L7.7 16.3Z"/><path fill="#3C3C3B" d="m16 29.5v-9.2l8.3-4L16 29.5Z"/><path fill="#141414" d="m16 18.8 8.3-3.9-8.3-3.8v7.7Z"/><path fill="#393939" d="m7.7 14.9 8.3 3.9v-7.7l-8.3 3.8Z"/></svg>,
    USDT: <svg viewBox="0 0 32 32" className="h-[68%] w-[68%]" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="white"/><path fill="#26A17B" d="M18 17.4v-.1c-.1 0-.8.1-2 .1s-1.9-.1-2-.1v.1c-4.3.2-7.5.9-7.5 1.8 0 .9 3.2 1.6 7.5 1.8v5.6h4v-5.6c4.3-.2 7.5-.9 7.5-1.8 0-.9-3.2-1.6-7.5-1.8Zm0 2.8v0c-.1 0-.8.1-2 .1s-1.9-.1-2-.1v0c-3.7-.2-6.4-.8-6.4-1.4s2.7-1.2 6.4-1.4v2.2c.1 0 .8.1 2 .1s1.9-.1 2-.1v-2.2c3.7.2 6.4.8 6.4 1.4s-2.7 1.2-6.4 1.4Z"/><path fill="#26A17B" d="M6.5 7h19v3.6h-7.3v3.1c4.1.2 7.2.9 7.2 1.7 0 1-4.2 1.8-9.4 1.8s-9.4-.8-9.4-1.8c0-.8 3.1-1.5 7.2-1.7v-3.1H6.5V7Zm9.5 7.6c-4.1 0-7.4.5-7.4 1.1s3.3 1.1 7.4 1.1 7.4-.5 7.4-1.1-3.3-1.1-7.4-1.1Z"/></svg>,
    SOL: <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" aria-hidden="true"><defs><linearGradient id="solana-logo-gradient" x1="5" x2="27" y1="27" y2="5" gradientUnits="userSpaceOnUse"><stop stopColor="#9945FF"/><stop offset=".5" stopColor="#8752F3"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs><path fill="url(#solana-logo-gradient)" d="M8.2 6h18.1c.7 0 1 .8.5 1.3l-3.6 3.6c-.2.2-.5.3-.8.3H4.3c-.7 0-1-.8-.5-1.3l3.6-3.6c.2-.2.5-.3.8-.3Zm0 8.1H26c.7 0 1 .8.5 1.3l-3.6 3.6c-.2.2-.5.3-.8.3H4.3c-.7 0-1-.8-.5-1.3l3.6-3.6c.2-.2.5-.3.8-.3Zm15.6 8.1H5.7c-.7 0-1-.8-.5-1.3l3.6-3.6c.2-.2.5-.3.8-.3h17.8c.7 0 1 .8.5 1.3l-3.6 3.6c-.1.2-.3.3-.5.3Z"/></svg>,
  }[asset.ticker]
  const background = asset.ticker === 'ETH' ? '#F3F4F6' : asset.ticker === 'SOL' ? '#111827' : asset.color
  return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full shadow-sm ${iconClass}`} style={{ background }} aria-label={`${asset.name} logo`}>{logo || <span className="text-[21px] text-white">{asset.mark}</span>}</div>
}

export default function AssetCard({ asset, onClick, currency = 'USD', exchangeRate = 1 }) {
  const value = asset.amount * asset.price * exchangeRate
  return <button onClick={onClick} className="surface lift flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left sm:p-4">
    <span className="flex min-w-0 items-center gap-3"><CoinIcon asset={asset} /><span className="min-w-0"><span className="block truncate font-semibold">{asset.name}</span><span className="muted mt-0.5 block text-xs">{asset.ticker} · {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></span></span>
    <span className="shrink-0 text-right"><span className="block font-semibold">{exchangeRate == null ? 'Rate unavailable' : formatCurrency(value, currency)}</span>{asset.amount > 0 ? <span className={`mt-0.5 inline-flex items-center justify-end gap-0.5 text-xs font-medium ${asset.change < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{asset.change < 0 ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}{Math.abs(asset.change).toFixed(2)}%</span> : <span className="muted mt-0.5 block text-xs">No balance</span>}</span>
    <ChevronRight className="muted shrink-0" size={16} />
  </button>
}
