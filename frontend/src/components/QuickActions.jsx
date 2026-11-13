import React from 'react'
import { ArrowDownLeft, ArrowUpRight, Link2, Plus } from 'lucide-react'

const actions = [
  { name: 'Withdraw', icon: ArrowUpRight, color: 'bg-blue-600 text-white hover:bg-blue-700' },
  { name: 'Receive', icon: ArrowDownLeft, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-300' },
  { name: 'Buy', icon: Plus, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300' },
  { name: 'Connect wallet', icon: Link2, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200' },
]

export default function QuickActions({ onAction, connectEnabled = true }) {
  return <div className="grid grid-cols-4 gap-2.5 sm:gap-4">{actions.map(({ name, icon: Icon, color }) => { const disabled = name === 'Connect wallet' && !connectEnabled; return <button key={name} disabled={disabled} title={disabled ? 'Wallet connection is disabled by your admin' : name} onClick={() => onAction(name === 'Connect wallet' ? 'connect' : name.toLowerCase())} className={`group flex min-w-0 flex-col items-center gap-2 transition-transform ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:-translate-y-0.5'}`}><span className={`grid h-13 w-13 place-items-center rounded-2xl shadow-sm transition-all group-hover:shadow-md sm:h-14 sm:w-14 ${color}`}><Icon size={20} strokeWidth={2.1}/></span><span className="text-center text-[11px] font-semibold leading-tight sm:text-xs">{name}</span></button> })}</div>
}
