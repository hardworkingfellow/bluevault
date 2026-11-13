import React, { useState } from 'react'
import { Bell, Check, ChevronRight, CircleHelp, Globe, KeyRound, LogOut, Moon, ShieldCheck, SlidersHorizontal, UserRound, WalletCards, X } from 'lucide-react'

const options = [
  { icon: UserRound, title: 'Personal information', sub: 'Your name and account details' },
  { icon: Bell, title: 'Notifications', sub: 'Choose what you hear about' },
  { icon: Globe, title: 'Language & region', sub: 'English (US) · USD' },
  { icon: CircleHelp, title: 'Help & support', sub: "We're here if you need us" },
]
const pinField = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-center text-lg tracking-[.35em] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'

export default function Profile({ dark, onToggleTheme, user, onSignOut, onSavePin }) {
  const [active, setActive] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const initials = user?.name?.split(' ').map(part => part[0]).slice(0, 2).join('') || 'U'

  const savePin = async event => {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) return setPinError('Choose a PIN with 4 to 6 digits.')
    if (pin !== confirmPin) return setPinError('The PIN entries do not match.')
    try {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      onSavePin({ salt, hash })
      setPin(''); setConfirmPin(''); setPinError(''); setPinSaved(true)
    } catch {
      setPinError('PIN setup is unavailable in this browser session.')
    }
  }

  return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div><p className="muted text-xs">Your account and preferences</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Profile</h2></div>
    <section className="surface flex items-center gap-4 rounded-[24px] p-5"><span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#e9dbca] font-display text-xl font-bold text-[#815e46]">{initials}</span><span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold">{user?.name}</span><span className="muted mt-1 block truncate text-xs">{user?.email}</span><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><ShieldCheck size={12}/> Approved account</span></span><button onClick={() => setActive(active ? '' : 'Edit profile')} className="text-xs font-semibold text-blue-600">Edit</button></section>
    <section className="surface flex flex-wrap items-center gap-4 rounded-[24px] p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--blue)]"><KeyRound size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Security PIN</span><span className="muted mt-1 block text-xs">{user?.pinHash ? 'A PIN is set for this account.' : 'Add a 4 to 6 digit PIN to your account.'}</span></span><button onClick={() => { setPinOpen(true); setPinSaved(false); setPinError('') }} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]">{user?.pinHash ? 'Change PIN' : 'Set PIN'}</button></section>
    <div className="surface divide-y divide-[var(--border)] overflow-hidden rounded-[24px]">{options.map(({ icon: Icon, title, sub }) => <button onClick={() => setActive(title)} key={title} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-[var(--surface-soft)] sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--blue)]"><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="muted mt-1 block text-xs">{title === 'Language & region' ? `English (US) · ${user?.currency || 'USD'}` : sub}</span></span><ChevronRight className="muted" size={17}/></button>)}</div>
    <section className="surface overflow-hidden rounded-[24px]"><div className="flex items-center gap-3.5 border-b border-[var(--border)] p-4 sm:p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--blue)]"><SlidersHorizontal size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Appearance</span><span className="muted mt-1 block text-xs">Choose how Bluevault looks</span></span></div><button onClick={onToggleTheme} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-[var(--surface-soft)] sm:p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--blue)]"><Moon size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Dark mode</span><span className="muted mt-1 block text-xs">Adjust the look for low light</span></span><span className={`relative h-6 w-11 rounded-full transition-colors ${dark ? 'bg-blue-600' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`}/></span></button></section>
    {active && <p role="status" className="muted text-center text-xs">{active} settings are coming soon.</p>}
    <button onClick={onSignOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"><LogOut size={16}/> Sign out</button>
    <p className="muted flex items-center justify-center gap-2 text-xs"><WalletCards size={14}/> Bluevault · Version 1.0.0</p>
    {pinOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) setPinOpen(false) }}><section className="surface animate-in w-full max-w-[420px] rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">{pinSaved ? <div className="py-7 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Check size={26}/></span><h3 className="mt-4 font-display text-lg font-bold">PIN saved</h3><p className="muted mt-2 text-xs">Your PIN hash is saved to your account.</p><button onClick={() => setPinOpen(false)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white">Done</button></div> : <><div className="mb-5 flex items-center justify-between"><span><h3 className="font-display text-lg font-bold">{user?.pinHash ? 'Change security PIN' : 'Set security PIN'}</h3><p className="muted mt-1 text-xs">Choose a PIN that is 4 to 6 digits.</p></span><button aria-label="Close" onClick={() => setPinOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-soft)]"><X size={17}/></button></div><form onSubmit={savePin} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold">New PIN</span><input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" autoComplete="new-password" aria-label="New PIN" placeholder="••••" className={pinField}/></label><label className="block"><span className="mb-2 block text-xs font-semibold">Confirm PIN</span><input value={confirmPin} onChange={event => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" autoComplete="new-password" aria-label="Confirm PIN" placeholder="••••" className={pinField}/></label>{pinError && <p role="alert" className="text-xs text-rose-500">{pinError}</p>}<button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Save PIN</button><p className="muted text-center text-[10px] leading-relaxed">This PIN does not protect sign-in or transactions.</p></form></>}</section></div>}
  </main>
}
