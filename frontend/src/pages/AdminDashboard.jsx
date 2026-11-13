import React, { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowUpRight, Bell, Ban, Check, CheckCircle2, CircleDollarSign, Database, Search, ShieldCheck, Users, WalletCards, Plus, ChevronDown, Trash2, XCircle } from 'lucide-react'
import { tokenCatalog } from '../data/mockAccounts.js'
import { getWalletDetails } from '../data/walletAddresses.js'

const inputClass = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'
const networkOptions = {
  BTC: ['Bitcoin'],
  ETH: ['Ethereum (ERC-20)'],
  USDT: ['TRON (TRC-20)', 'Ethereum (ERC-20)', 'BNB Smart Chain (BEP-20)'],
  SOL: ['Solana'],
}

export default function AdminDashboard({ accounts, adminActivity, adminAlerts, onLoadActivity, onLoadAlerts, onSendAlert, onEditAlert, onDeleteAlert, onDeleteUser, onUpdate, onUpdateMany, onSetUserStatus, onSendToken, walletConnectEnabled, onToggleWalletConnect, onSignOut }) {
  const [selectedId, setSelectedId] = useState(accounts[0]?.id || '')
  const [activeTab, setActiveTab] = useState('users')
  const [search, setSearch] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [creditAmounts, setCreditAmounts] = useState({})
  const [alertRecipientSearch, setAlertRecipientSearch] = useState('')
  const [editingAlertId, setEditingAlertId] = useState('')
  const [editingAlertTitle, setEditingAlertTitle] = useState('')
  const [editingAlertMessage, setEditingAlertMessage] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [deletingUser, setDeletingUser] = useState(false)
  const [token, setToken] = useState('USDT')
  const [address, setAddress] = useState('')
  const [depositAsset, setDepositAsset] = useState(accounts[0]?.depositAsset || 'USDT')
  const [network, setNetwork] = useState('TRON (TRC-20)')
  const [savingAddress, setSavingAddress] = useState(false)
  const [fee, setFee] = useState('')
  const [feeTitle, setFeeTitle] = useState('')
  const [feeDescription, setFeeDescription] = useState('')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { if (activeTab === 'activity') onLoadActivity() }, [activeTab])
  useEffect(() => { if (activeTab === 'alerts') onLoadAlerts() }, [activeTab])
  const account = accounts.find(item => item.id === selectedId)
  const filtered = useMemo(() => accounts.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())), [accounts, search])
  const tokenRecipients = useMemo(() => accounts.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(recipientSearch.toLowerCase())), [accounts, recipientSearch])
  const alertRecipients = useMemo(() => accounts.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(alertRecipientSearch.toLowerCase())), [accounts, alertRecipientSearch])
  useEffect(() => {
    if (!account) return
    const wallet = getWalletDetails(account, depositAsset)
    setAddress(wallet.address)
    setNetwork(wallet.network || networkOptions[depositAsset][0])
  }, [account, depositAsset])
  const pending = accounts.filter(user => user.status === 'pending').length
  const approved = accounts.filter(user => user.status === 'approved').length
  const usdTotal = accounts.reduce((sum, user) => sum + tokenCatalog.reduce((subtotal, coin) => subtotal + (user.balances[coin.ticker] || 0) * coin.price, 0), 0)
  const selectAccount = user => {
    setSelectedId(user.id)
    setAddress(user.depositAddress || '')
    const asset = user.depositAsset || 'USDT'
    setDepositAsset(asset)
    setNetwork(user.network || networkOptions[asset][0])
    setFee(user.fee ? String(user.fee) : '')
    setFeeTitle(user.feeTitle || '')
    setFeeDescription(user.feeDescription || '')
    setMessage('')
  }
  const update = (field, value) => {
    if (!account) return
    onUpdate(account.id, field, value)
    setMessage('User settings saved.')
  }
  const changeStatus = async status => {
    if (!account) return
    const result = await onSetUserStatus(account.id, status)
    if (!result?.ok) return setMessage(result?.error || 'Could not update this account.')
    setMessage(`${account.name}'s account status changed to ${status}.`)
  }
  const confirmDeleteUser = async () => {
    if (!deleteCandidate || deletingUser) return
    setDeletingUser(true)
    const result = await onDeleteUser(deleteCandidate.id)
    setDeletingUser(false)
    if (!result?.ok) return setMessage(result?.error || 'Could not delete this account.')
    setMessage(`${deleteCandidate.name}'s account was deleted.`)
    if (selectedId === deleteCandidate.id) setSelectedId(accounts.find(user => user.id !== deleteCandidate.id)?.id || '')
    setDeleteCandidate(null)
  }
  const saveFundingAddress = async () => {
    if (!account || savingAddress || !address.trim()) return
    const depositAddresses = {
      ...(account.depositAddresses || {}),
      [depositAsset]: { address: address.trim(), network },
    }
    setSavingAddress(true)
    const result = await onUpdateMany(account.id, { depositAddresses })
    setSavingAddress(false)
    if (!result?.ok) return setMessage(result?.error || 'Could not save this funding address.')
    setMessage(`${depositAsset} wallet address saved for ${account.name}.`)
  }
  const removeFundingAddress = async () => {
    if (!account || savingAddress || !address) return
    const depositAddresses = {
      ...(account.depositAddresses || {}),
      [depositAsset]: { address: '', network },
    }
    setSavingAddress(true)
    const result = await onUpdateMany(account.id, { depositAddresses })
    setSavingAddress(false)
    if (!result?.ok) return setMessage(result?.error || 'Could not remove this wallet address.')
    setAddress('')
    setMessage(`${depositAsset} wallet address removed for ${account.name}.`)
  }
  const saveFee = () => {
    if (!account) return
    const amountDue = Math.max(0, Number(fee) || 0)
    onUpdateMany(account.id, { fee: amountDue, feeTitle: feeTitle.trim(), feeDescription: feeDescription.trim(), feeStatus: amountDue > 0 ? 'due' : 'none' })
    setMessage(amountDue > 0 ? 'Fee and description assigned to user.' : 'Fee cleared for user.')
  }
  const deleteFee = () => {
    if (!account) return
    onUpdateMany(account.id, { fee: 0, feeTitle: '', feeDescription: '', feeStatus: 'none' })
    setFee(''); setFeeTitle(''); setFeeDescription('')
    setMessage('Fee payable deleted.')
  }
  const creditUser = async user => {
    const qty = Number(creditAmounts[user.id])
    if (!Number.isFinite(qty) || qty <= 0) return setMessage('Enter an amount greater than zero for this user.')
    const result = await onSendToken(user.id, token, qty)
    if (!result?.ok) return setMessage(result?.error || 'Could not credit the selected user.')
    setMessage(`${qty} ${token} credited to ${user.name}.`)
    setCreditAmounts(previous => ({ ...previous, [user.id]: '' }))
  }
  const sendAlertToUser = async user => {
    if (!alertTitle.trim() || !alertMessage.trim()) return setMessage('Enter an alert title and message first.')
    const result = await onSendAlert(user.id, alertTitle, alertMessage)
    if (!result.ok) return setMessage(result.error)
    setAlertTitle(''); setAlertMessage('')
    setMessage(`Alert sent to ${user.name}.`)
    await onLoadAlerts()
  }

  const activityRows = adminActivity
  const tabs = <div className="flex flex-wrap gap-2"><button onClick={() => setActiveTab('users')} className={`rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'surface muted'}`}>Users</button><button onClick={() => setActiveTab('wallets')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'wallets' ? 'bg-blue-600 text-white' : 'surface muted'}`}><WalletCards size={14}/> Wallet addresses</button><button onClick={() => setActiveTab('tokens')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'tokens' ? 'bg-blue-600 text-white' : 'surface muted'}`}><ArrowUpRight size={14}/> Token credits</button><button onClick={() => setActiveTab('alerts')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'alerts' ? 'bg-blue-600 text-white' : 'surface muted'}`}><Bell size={14}/> Alerts</button><button onClick={() => setActiveTab('activity')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'activity' ? 'bg-blue-600 text-white' : 'surface muted'}`}><Activity size={14}/> Activity</button><button onClick={() => setActiveTab('database')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${activeTab === 'database' ? 'bg-blue-600 text-white' : 'surface muted'}`}><Database size={14}/> Database</button></div>
  if (activeTab === 'wallets') return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Wallet addresses</h2><p className="muted mt-1 text-xs">Add, edit, or remove a user's deposit address for each supported asset.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold">Sign out</button></div>
    {tabs}
    <section className="surface max-w-3xl rounded-[24px] p-5 sm:p-6">
      <label className="block"><span className="mb-2 block text-xs font-semibold">User account</span><select value={selectedId} onChange={event => { const user = accounts.find(item => item.id === event.target.value); if (user) selectAccount(user) }} className={inputClass}>{accounts.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select></label>
      {account ? <><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-semibold">Asset</span><select value={depositAsset} onChange={event => { setDepositAsset(event.target.value); setMessage('') }} className={inputClass}>{tokenCatalog.map(coin => <option key={coin.ticker} value={coin.ticker}>{coin.name} ({coin.ticker})</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-semibold">Network</span><select value={network} onChange={event => setNetwork(event.target.value)} className={inputClass}>{networkOptions[depositAsset].map(option => <option key={option} value={option}>{option}</option>)}</select></label></div>
        <label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">{depositAsset} wallet address</span><input value={address} onChange={event => setAddress(event.target.value)} maxLength={500} placeholder={`Enter ${depositAsset} wallet address`} className={inputClass}/></label>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={savingAddress || !address.trim()} onClick={saveFundingAddress} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingAddress ? 'Saving…' : 'Save address'}</button><button type="button" disabled={savingAddress || !address} onClick={removeFundingAddress} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:hover:bg-rose-950/30"><Trash2 size={14}/> Remove address</button></div>
      </> : <p className="muted mt-4 text-sm">No user accounts available.</p>}
      {message && <p role="status" className={`mt-4 text-xs font-medium ${message.includes('Could not') || message.includes('Failed') ? 'text-rose-600' : 'text-blue-600'}`}>{message}</p>}
    </section>
  </main>
  if (activeTab === 'database') return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Database</h2><p className="muted mt-1 text-xs">Manage user accounts stored in the database.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold">Sign out</button></div>{tabs}
    <section className="surface overflow-hidden rounded-[24px]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-5"><div><h3 className="font-display font-bold">User accounts</h3><p className="muted mt-1 text-xs">{filtered.length} of {accounts.length} accounts</p></div><label className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] px-3 sm:max-w-xs"><Search className="muted" size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" className="w-full bg-transparent py-2.5 text-xs outline-none"/></label></div><div className="divide-y divide-[var(--border)]">{filtered.length ? filtered.map(user => <div key={user.id} className="flex items-center gap-3 p-4 sm:px-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="muted mt-0.5 block truncate text-xs">{user.email}</span></span><span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold capitalize">{user.status}</span><button type="button" title={`Delete ${user.name}`} aria-label={`Delete ${user.name}`} onClick={() => { setDeleteCandidate(user); setMessage('') }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={17}/></button></div>) : <p className="muted p-10 text-center text-xs">No user accounts found.</p>}</div></section>
    {message && <p role="status" className="text-xs font-medium text-blue-600">{message}</p>}
    {deleteCandidate && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]" onMouseDown={event => { if (event.target === event.currentTarget && !deletingUser) setDeleteCandidate(null) }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description" className="surface animate-in w-full max-w-md rounded-[26px] p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40"><Trash2 size={19}/></div><h3 id="delete-user-title" className="mt-4 font-display text-lg font-bold">Delete user account?</h3><p id="delete-user-description" className="muted mt-2 text-sm leading-relaxed">This permanently deletes <strong className="text-[var(--text)]">{deleteCandidate.name}</strong> ({deleteCandidate.email}) and removes their account data from MongoDB. This cannot be undone.</p>{message && <p role="alert" className="mt-3 text-xs text-rose-600">{message}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deletingUser} onClick={() => setDeleteCandidate(null)} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-semibold">Cancel</button><button type="button" disabled={deletingUser} onClick={confirmDeleteUser} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{deletingUser ? 'Deleting…' : 'Delete account'}</button></div></section></div>}
  </main>
  if (activeTab === 'tokens') return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Token credits</h2><p className="muted mt-1 text-xs">Find a user and credit tokens directly from their row.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold">Sign out</button></div>
    {tabs}
    <section className="surface overflow-hidden rounded-[24px]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
        <div><h3 className="font-display font-bold">All users</h3><p className="muted mt-1 text-xs">{tokenRecipients.length} of {accounts.length} users</p></div>
        <label className="block w-full sm:max-w-[240px]"><span className="mb-2 block text-xs font-semibold">Token to credit</span><select value={token} onChange={event => setToken(event.target.value)} className={inputClass}>{tokenCatalog.map(coin => <option key={coin.ticker} value={coin.ticker}>{coin.name} ({coin.ticker})</option>)}</select></label>
        <label className="block w-full sm:max-w-[300px]"><span className="mb-2 block text-xs font-semibold">Search users</span><span className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3"><Search className="muted" size={16}/><input value={recipientSearch} onChange={event => setRecipientSearch(event.target.value)} placeholder="Name or email" className="w-full bg-transparent py-3 text-sm outline-none"/></span></label>
      </div>
      <div className="divide-y divide-[var(--border)]">{tokenRecipients.length ? tokenRecipients.map(user => <div key={user.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="muted mt-0.5 block truncate text-xs">{user.email}</span><span className="muted mt-1 block text-[10px]">Current {token} balance: {(user.balances?.[token] || 0).toLocaleString()}</span></span><input aria-label={`Amount of ${token} to credit to ${user.name}`} value={creditAmounts[user.id] || ''} onChange={event => setCreditAmounts(previous => ({ ...previous, [user.id]: event.target.value }))} type="number" min="0" step="any" placeholder="Amount" className={`${inputClass} w-32`}/><button type="button" onClick={() => creditUser(user)} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-700"><Plus size={14}/> Credit</button></div>) : <p className="muted p-8 text-center text-xs">No users match that search.</p>}</div>
      {message && <p role="status" className="m-4 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{message}</p>}
    </section>
  </main>
  if (activeTab === 'alerts') return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">User alerts</h2><p className="muted mt-1 text-xs">Write an alert once, then send it directly to any user below.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold">Sign out</button></div>
    {tabs}
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="surface overflow-hidden rounded-[24px]">
        <div className="border-b border-[var(--border)] p-5 sm:p-6"><div className="flex items-center gap-2"><Bell className="text-blue-600" size={18}/><h3 className="font-display font-bold">Send alert to a user</h3></div><label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Alert title</span><input value={alertTitle} onChange={event => setAlertTitle(event.target.value)} maxLength={120} placeholder="Account update" className={inputClass}/></label><label className="mt-3 block"><span className="mb-2 block text-xs font-semibold">Message</span><textarea value={alertMessage} onChange={event => setAlertMessage(event.target.value)} maxLength={1000} rows={3} placeholder="Write the notification users will see" className={inputClass}/></label><label className="mt-3 block"><span className="mb-2 block text-xs font-semibold">Find user</span><span className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3"><Search className="muted" size={16}/><input value={alertRecipientSearch} onChange={event => setAlertRecipientSearch(event.target.value)} placeholder="Search by name or email" className="w-full bg-transparent py-3 text-sm outline-none"/></span></label><p className="muted mt-3 text-[11px]">{alertRecipients.length} of {accounts.length} users</p></div>
        <div className="max-h-[540px] divide-y divide-[var(--border)] overflow-auto">{alertRecipients.length ? alertRecipients.map(user => <div key={user.id} className="flex items-center gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.name}</span><span className="muted mt-0.5 block truncate text-[10px]">{user.email}</span></span><button type="button" disabled={!alertTitle.trim() || !alertMessage.trim()} onClick={() => sendAlertToUser(user)} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Bell size={13}/> Send alert</button></div>) : <p className="muted p-8 text-center text-xs">No users match that search.</p>}</div>
        {message && <p role="status" className="m-4 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{message}</p>}
      </section>
      <section className="surface overflow-hidden rounded-[24px]"><div className="border-b border-[var(--border)] p-5 sm:p-6"><h3 className="font-display font-bold">Sent alerts</h3><p className="muted mt-1 text-xs">Edit or delete sent alerts. Deletions are saved to MongoDB immediately.</p></div><div className="max-h-[700px] divide-y divide-[var(--border)] overflow-auto">{adminAlerts.length ? adminAlerts.map(alert => <article key={`${alert.userId}-${alert.id}`} className="p-4 sm:p-5">{editingAlertId === alert.id ? <form onSubmit={async event => { event.preventDefault(); const result = await onEditAlert(alert.userId, alert.id, editingAlertTitle, editingAlertMessage); if (!result.ok) return setMessage(result.error); setEditingAlertId(''); setMessage('Alert updated.') }} className="space-y-3"><input value={editingAlertTitle} onChange={event => setEditingAlertTitle(event.target.value)} maxLength={120} required className={inputClass}/><textarea value={editingAlertMessage} onChange={event => setEditingAlertMessage(event.target.value)} maxLength={1000} required rows={3} className={inputClass}/><div className="flex gap-2"><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Save changes</button><button type="button" onClick={() => setEditingAlertId('')} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">Cancel</button></div></form> : <><div className="flex flex-wrap items-start justify-between gap-3"><span><h4 className="text-sm font-semibold">{alert.title}</h4><p className="muted mt-1 text-xs">To {alert.userName} · {alert.userEmail}</p></span><span className="flex shrink-0 gap-2"><button onClick={() => { setEditingAlertId(alert.id); setEditingAlertTitle(alert.title); setEditingAlertMessage(alert.message) }} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold">Edit</button><button onClick={async () => { const result = await onDeleteAlert(alert.userId, alert.id); setMessage(result.ok ? 'Alert deleted.' : result.error) }} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"><Trash2 size={13}/> Delete</button></span></div><p className="muted mt-3 whitespace-pre-wrap text-xs leading-relaxed">{alert.message}</p><time className="muted mt-2 block text-[10px]">{new Date(alert.createdAt).toLocaleString()}</time></>}</article>) : <p className="muted p-8 text-center text-xs">No alerts have been sent.</p>}</div></section>
    </div>
  </main>
  if (activeTab === 'activity') return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Admin dashboard</h2><p className="muted mt-1 text-xs">Review activity across all user accounts.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]">Sign out</button></div>{tabs}<section className="surface overflow-hidden rounded-[24px]"><div className="border-b border-[var(--border)] p-5"><h3 className="font-display font-bold">Account activity</h3><p className="muted mt-1 text-xs">{activityRows.length} recorded actions</p></div>{activityRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="muted bg-[var(--surface-soft)]"><tr><th className="px-5 py-3 font-semibold">User</th><th className="px-5 py-3 font-semibold">Activity</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Date</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{activityRows.map(row => <tr key={`${row.userEmail}-${row.id}`}><td className="px-5 py-3"><span className="block font-semibold">{row.userName}</span><span className="muted mt-1 block">{row.userEmail}</span></td><td className="px-5 py-3">{row.title}</td><td className="px-5 py-3 font-semibold">{row.amount?.toLocaleString()} {row.ticker}</td><td className="px-5 py-3">{row.status || 'Completed'}</td><td className="muted px-5 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleString() : 'â€”'}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><p className="font-semibold">No activity yet</p><p className="muted mt-1 text-xs">User transactions will appear here.</p></div>}</section></main>

  return <main className="animate-in space-y-6 pb-28 pt-5 lg:pb-8 lg:pt-1">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-xs">Bluevault operations</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Admin dashboard</h2><p className="muted mt-1 text-xs">Manage accounts, funding, and wallet balances.</p></div><button onClick={onSignOut} className="rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]">Sign out</button></div>
    {tabs}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ label: 'Total users', value: accounts.length, icon: Users }, { label: 'Awaiting approval', value: pending, icon: ShieldCheck }, { label: 'Approved accounts', value: approved, icon: CheckCircle2 }, { label: 'Balances', value: `$${usdTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: CircleDollarSign }].map(({ label, value, icon: Icon }) => <div key={label} className="surface rounded-2xl p-4"><span className="flex items-center justify-between"><span className="muted text-xs">{label}</span><Icon className="text-blue-600" size={17}/></span><span className="mt-3 block font-display text-xl font-bold">{value}</span></div>)}</div>
    <section className="surface rounded-[24px] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display font-bold">Admin token balance</h3><p className="muted mt-1 text-xs">Unlimited token supply available to credit to users.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">UNLIMITED</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{tokenCatalog.map(coin => <div key={coin.ticker} className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-3"><span className="truncate text-xs font-semibold">{coin.ticker}</span><span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Unlimited</span></div>)}</div></section>
    <section className="surface flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-5 sm:p-6"><span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--blue)]"><WalletCards size={18}/></span><span className="min-w-0"><span className="block text-sm font-semibold">User wallet address connection</span><span className="muted mt-1 block text-xs">Allow users to add or update a wallet address in their dashboard.</span></span></span><button type="button" role="switch" aria-checked={walletConnectEnabled} onClick={onToggleWalletConnect} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${walletConnectEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${walletConnectEnabled ? 'translate-x-6' : 'translate-x-1'}`}/></button><span className={`w-full text-right text-[10px] font-semibold sm:w-auto ${walletConnectEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'muted'}`}>{walletConnectEnabled ? 'Enabled for users' : 'Disabled for users'}</span></section>
    <div className="grid items-start gap-6 xl:grid-cols-[.9fr_1.5fr]">
      <section className="surface overflow-hidden rounded-[24px]"><div className="border-b border-[var(--border)] p-4 sm:p-5"><h3 className="font-display font-bold">Users</h3><div className="surface-soft mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"><Search className="muted" size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a user" className="w-full bg-transparent text-xs outline-none"/></div></div><div className="max-h-[410px] overflow-y-auto p-2">{filtered.map(user => <button onClick={() => selectAccount(user)} key={user.id} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${account?.id === user.id ? 'nav-active' : 'hover:bg-[var(--surface-soft)]'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.name}</span><span className="muted mt-0.5 block truncate text-[10px]">{user.email}</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : user.status === 'rejected' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50' : user.status === 'banned' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'}`}>{user.status}</span></button>)}</div></section>
      {account ? <div className="space-y-5">
        <section className="surface rounded-[24px] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="muted text-xs">Selected account</p><h3 className="mt-1 font-display text-lg font-bold">{account.name}</h3><p className="muted mt-1 text-xs">{account.email}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => changeStatus('approved')} disabled={account.status === 'approved'} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Check size={14}/> Approve</button><button onClick={() => changeStatus('rejected')} disabled={account.status === 'rejected' || account.status === 'banned'} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-600 disabled:opacity-40"><XCircle size={14}/> Reject</button>{account.status === 'banned' ? <button onClick={() => changeStatus('approved')} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold"><Check size={14}/> Unban</button> : <button onClick={() => changeStatus('banned')} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"><Ban size={14}/> Ban</button>}</div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{tokenCatalog.map(coin => <div key={coin.ticker} className="rounded-xl bg-[var(--surface-soft)] p-3"><span className="muted text-[10px]">{coin.ticker}</span><span className="mt-1 block truncate text-sm font-bold">{(account.balances[coin.ticker] || 0).toLocaleString()}</span></div>)}</div></section>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface min-w-0 rounded-[24px] p-5"><div className="flex items-center gap-2"><WalletCards className="text-blue-600" size={18}/><h3 className="font-display text-sm font-bold">Funding address</h3></div><p className="muted mt-1 text-xs">Choose the asset and network for this userâ€™s deposit address.</p><div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Asset</span><span className="relative block"><select value={depositAsset} onChange={event => { const next = event.target.value; setDepositAsset(next); setNetwork(networkOptions[next][0]) }} className={`${inputClass} appearance-none pr-10`}><option value="BTC">Bitcoin (BTC)</option><option value="ETH">Ethereum (ETH)</option><option value="USDT">Tether (USDT)</option><option value="SOL">Solana (SOL)</option></select><ChevronDown className="muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16}/></span></label><label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Network</span><span className="relative block"><select value={network} onChange={event => setNetwork(event.target.value)} className={`${inputClass} appearance-none pr-10`}>{networkOptions[depositAsset].map(option => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16}/></span></label></div><label className="mt-3 block min-w-0"><span className="mb-2 block text-xs font-semibold">Wallet address</span><input value={address} onChange={event => setAddress(event.target.value)} placeholder={`Enter ${depositAsset} deposit address`} className={`${inputClass} min-w-0`}/></label><button onClick={saveFundingAddress} className="mt-3 w-full rounded-xl border border-[var(--border)] py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]">Save funding address</button></section>
          <section className="surface rounded-[24px] p-5"><div className="flex items-center gap-2"><CircleDollarSign className="text-blue-600" size={18}/><h3 className="font-display text-sm font-bold">Fee payable</h3></div><p className="muted mt-1 text-xs">Add a title, amount, and explanation for this user.</p><label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Fee title</span><input value={feeTitle} onChange={event => setFeeTitle(event.target.value)} placeholder="e.g. Account verification" className={inputClass}/></label><label className="mt-3 block"><span className="mb-2 block text-xs font-semibold">Fee description</span><textarea value={feeDescription} onChange={event => setFeeDescription(event.target.value)} placeholder="Explain what this fee covers" rows={2} className={inputClass}/></label><label className="mt-3 block"><span className="mb-2 block text-xs font-semibold">Fee amount (USD)</span><input value={fee} onChange={event => setFee(event.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className={inputClass}/></label><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={saveFee} className="rounded-xl border border-[var(--border)] py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]">Save fee</button><button onClick={deleteFee} disabled={!account.fee && !account.feeTitle && !account.feeDescription} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:hover:bg-rose-950/30"><Trash2 size={13}/> Delete fee</button></div></section>
        </div>
      </div> : <section className="surface rounded-2xl p-10 text-center"><p className="muted text-sm">No matching accounts.</p></section>}
    </div>
    <section className="surface rounded-[24px] p-5"><div className="flex items-center gap-2"><ArrowDownToLine className="text-blue-600" size={17}/><h3 className="font-display text-sm font-bold">Account management</h3></div><p className="muted mt-2 text-xs leading-relaxed">Approvals, wallet addresses, fee settings, and token credits are saved to user accounts. No real funds are moved.</p></section>
  </main>
}
