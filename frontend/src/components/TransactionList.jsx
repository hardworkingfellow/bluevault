import React from 'react'
import { ArrowDownLeft, ArrowUpRight, ArrowUpLeft, ChevronRight, Clock3 } from 'lucide-react'

const symbols = { BTC: '₿', ETH: '◆', USDT: '₮', SOL: '◎' }
function TransactionRow({ tx, asset, onClick }) {
  const incoming = tx.type === 'received'
  const bought = tx.type === 'bought'
  const Icon = incoming ? ArrowDownLeft : bought ? ArrowUpLeft : ArrowUpRight
  const date = tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Just now')
  return <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-xl py-3 text-left transition hover:bg-[var(--surface-soft)]"><span className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${incoming ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><Icon size={18}/></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{tx.title}</span><span className="muted mt-1 flex items-center gap-1 text-[11px]"><Clock3 size={11}/>{date}</span></span></span><span className="shrink-0 text-right"><span className={`block text-sm font-semibold ${incoming ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{incoming ? '+' : '−'}{tx.amount.toLocaleString()} {tx.ticker}</span><span className="muted mt-1 block text-[11px]">{tx.status}</span></span></button>
}

export default function TransactionList({ transactions, assets, title = 'Recent activity', onViewAll, onTransaction }) {
  return <section><div className="mb-2 flex items-center justify-between"><h3 className="font-display text-[15px] font-bold">{title}</h3>{onViewAll && <button onClick={onViewAll} className="flex items-center gap-0.5 text-xs font-semibold text-[var(--blue)] transition hover:opacity-70">See all <ChevronRight size={14}/></button>}</div><div className="divide-y divide-[var(--border)]">{transactions.length ? transactions.map(tx => <TransactionRow key={tx.id} tx={tx} asset={assets?.find(item => item.ticker === tx.ticker)} onClick={() => onTransaction?.(tx)}/>) : <div className="muted py-9 text-center text-sm">No transactions to show yet.</div>}</div></section>
}
