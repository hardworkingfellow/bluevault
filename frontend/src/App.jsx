import React, { useEffect, useMemo, useState } from 'react'
import { Bell, Moon, Sun, X } from 'lucide-react'
import { mockAssets } from './data/mockAssets.js'
import { api } from './api.js'
import BottomNavigation from './components/BottomNavigation.jsx'
import Header from './components/Header.jsx'
import SendModal from './components/SendModal.jsx'
import ReceiveModal from './components/ReceiveModal.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import ConnectWalletModal from './components/ConnectWalletModal.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AssetDetails from './pages/AssetDetails.jsx'
import Activity from './pages/Activity.jsx'
import Profile from './pages/Profile.jsx'
import Auth from './pages/Auth.jsx'
import AccountPending from './pages/AccountPending.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Funding from './pages/Funding.jsx'

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('bluevault-theme') === 'dark')
  const [accounts, setAccounts] = useState([])
  const [sharedDepositAddresses, setSharedDepositAddresses] = useState({})
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [adminActivity, setAdminActivity] = useState([])
  const [adminAlerts, setAdminAlerts] = useState([])
  const [alerts, setAlerts] = useState([])
  const [page, setPage] = useState('home')
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [walletConnectEnabled, setWalletConnectEnabled] = useState(true)
  const [notice, setNotice] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [exchange, setExchange] = useState({ currency: 'USD', rate: 1, date: null })
  useEffect(() => { localStorage.setItem('bluevault-theme', dark ? 'dark' : 'light'); const timer = setTimeout(() => setLoaded(true), 450); return () => clearTimeout(timer) }, [dark])
  useEffect(() => { document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => {
    const token = localStorage.getItem('bluevault-token')
    if (!token) { setAuthReady(true); return }
    api('/api/auth/me', { token }).then(async ({ user }) => {
      let loadedAccounts = [user]
      if (user.role === 'admin') {
        const adminData = await api('/api/admin/users', { token })
        loadedAccounts = adminData.users
        setSharedDepositAddresses(adminData.depositAddresses || {})
      } else {
        setSharedDepositAddresses({})
      }
      setAccounts(loadedAccounts)
      if (user.role === 'user') setAlerts(user.alerts || [])
      setSession({ token, role: user.role, userId: user.id })
    }).catch(error => {
      localStorage.removeItem('bluevault-token')
      if (/banned|rejected|suspended/i.test(error.message)) setConnectionError(error.message)
    }).finally(() => setAuthReady(true))
  }, [])

  const currentUser = session?.role === 'user' ? accounts.find(account => account.id === session.userId) : null
  useEffect(() => {
    if (session?.role !== 'user' || (page !== 'funding' && dialog?.type !== 'receive')) return
    let active = true
    const refreshUser = async () => {
      try {
        const { user } = await api('/api/auth/me', { token: session.token })
        if (active) setAccounts(previous => previous.map(account => account.id === user.id ? user : account))
      } catch (error) {
        if (active) setConnectionError(error.message)
      }
    }
    refreshUser()
    window.addEventListener('focus', refreshUser)
    return () => {
      active = false
      window.removeEventListener('focus', refreshUser)
    }
  }, [page, dialog?.type, session?.role, session?.token])
  const currency = currentUser?.currency || 'USD'
  useEffect(() => {
    if (!currentUser || currency === 'USD') { setExchange({ currency: 'USD', rate: 1, date: null }); return }
    const controller = new AbortController()
    setExchange({ currency, rate: null, date: null })
    fetch(`https://api.frankfurter.dev/v2/rate/usd/${currency.toLowerCase()}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Exchange rate unavailable'); return response.json() })
      .then(result => setExchange({ currency, rate: Number(result.rate), date: result.date }))
      .catch(error => { if (error.name !== 'AbortError') setExchange({ currency, rate: null, date: null }) })
    return () => controller.abort()
  }, [currentUser?.id, currency])
  const changeCurrency = async nextCurrency => {
    const result = await updateAccountFields(currentUser.id, { currency: nextCurrency })
    if (result.ok) setConnectionError('')
  }
  const assets = useMemo(() => mockAssets.map(asset => ({ ...asset, amount: currentUser?.balances?.[asset.ticker] || 0 })), [currentUser])
  const transactions = currentUser?.transactions || []
  const balance = useMemo(() => assets.reduce((total, asset) => total + asset.amount * asset.price, 0), [assets])
  const updateAccount = async (id, field, value) => {
    await updateAccountFields(id, { [field]: value })
  }
  const updateAccountFields = async (id, fields) => {
    try {
      const isAdmin = session?.role === 'admin'
      const result = await api(isAdmin ? `/api/admin/users/${id}` : '/api/auth/me', { token: session.token, method: 'PATCH', body: JSON.stringify(fields) })
      const updated = result.user
      setAccounts(previous => previous.map(account => account.id === updated.id ? updated : account))
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const saveSharedDepositAddresses = async depositAddresses => {
    try {
      const result = await api('/api/admin/deposit-addresses', {
        token: session.token,
        method: 'PATCH',
        body: JSON.stringify({ depositAddresses }),
      })
      setSharedDepositAddresses(result.depositAddresses)
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const setAccountStatus = (id, status) => updateAccount(id, 'status', status)
  const deleteUser = async id => {
    try {
      await api(`/api/admin/users/${id}`, { token: session.token, method: 'DELETE' })
      setAccounts(previous => previous.filter(account => account.id !== id))
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const sendToken = async (id, ticker, amount) => {
    try { const { user } = await api(`/api/admin/users/${id}/credit`, { token: session.token, method: 'POST', body: JSON.stringify({ ticker, amount }) }); setAccounts(previous => previous.map(account => account.id === id ? user : account)); return { ok: true } }
    catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const sendAlert = async (id, title, message) => {
    try {
      const { alert } = await api(`/api/admin/users/${id}/alerts`, { token: session.token, method: 'POST', body: JSON.stringify({ title, message }) })
      setAccounts(previous => previous.map(account => account.id === id ? { ...account, alerts: [alert, ...(account.alerts || [])] } : account))
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const loadAdminAlerts = async () => {
    try { const { alerts: latestAlerts } = await api('/api/admin/alerts', { token: session.token }); setAdminAlerts(latestAlerts); return latestAlerts }
    catch (error) { setConnectionError(error.message); return [] }
  }
  const editAlert = async (userId, alertId, title, message) => {
    try {
      const { alerts: updatedAlerts } = await api(`/api/admin/users/${userId}/alerts/${alertId}`, { token: session.token, method: 'PATCH', body: JSON.stringify({ title, message }) })
      setAccounts(previous => previous.map(account => account.id === userId ? { ...account, alerts: updatedAlerts } : account))
      await loadAdminAlerts()
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const deleteAlert = async (userId, alertId) => {
    try {
      const { alerts: updatedAlerts } = await api(`/api/admin/users/${userId}/alerts/${alertId}`, { token: session.token, method: 'DELETE' })
      setAccounts(previous => previous.map(account => account.id === userId ? { ...account, alerts: updatedAlerts } : account))
      setAdminAlerts(previous => previous.filter(alert => !(alert.userId === userId && alert.id === alertId)))
      return { ok: true }
    } catch (error) { setConnectionError(error.message); return { ok: false, error: error.message } }
  }
  const toggleNotifications = async () => {
    if (notice) { setNotice(false); return }
    setNotice(true)
    try { const { alerts: latestAlerts } = await api('/api/alerts', { token: session.token }); setAlerts(latestAlerts) }
    catch (error) { setConnectionError(error.message) }
  }
  const loadAdminActivity = async () => {
    try { const { activities } = await api('/api/admin/activity', { token: session.token }); setAdminActivity(activities); return activities }
    catch (error) { setConnectionError(error.message); return [] }
  }
  const buyToken = async (ticker, amount) => {
    if (!currentUser) return
    try { const { activity } = await api('/api/activity', { token: session.token, method: 'POST', body: JSON.stringify({ title: `Bought ${ticker}`, ticker, amount, type: 'bought' }) }); setAccounts(previous => previous.map(account => account.id === currentUser.id ? { ...account, balances: { ...account.balances, [ticker]: (account.balances[ticker] || 0) + amount }, transactions: [...account.transactions, activity] } : account)); setPage('home') }
    catch (error) { setConnectionError(error.message) }
  }
  const recordActivity = async ({ ticker, amount, type, title }) => {
    if (!currentUser) return { ok: false, error: 'Sign in to continue.' }
    try {
      const { activity } = await api('/api/activity', { token: session.token, method: 'POST', body: JSON.stringify({ title, ticker, amount, type }) })
      setAccounts(previous => previous.map(account => account.id !== currentUser.id ? account : {
        ...account,
        balances: { ...account.balances, [ticker]: (account.balances[ticker] || 0) + (type === 'received' || type === 'bought' ? amount : -amount) },
        transactions: [...account.transactions, activity],
      }))
      return { ok: true }
    } catch (error) { return { ok: false, error: error.message } }
  }
  const payFee = () => currentUser && updateAccount(currentUser.id, 'feeStatus', 'paid')
  const authenticate = async (path, details) => {
    try {
      const payload = await api(path, { method: 'POST', body: JSON.stringify(details) })
      const token = payload.token
      localStorage.setItem('bluevault-token', token)
      const user = payload.user
      let loadedAccounts = [user]
      if (user.role === 'admin') {
        const adminData = await api('/api/admin/users', { token })
        loadedAccounts = adminData.users
        setSharedDepositAddresses(adminData.depositAddresses || {})
      } else {
        setSharedDepositAddresses({})
      }
      setAccounts(loadedAccounts)
      if (user.role === 'user') setAlerts(user.alerts || [])
      setSession({ token, role: user.role, userId: user.id })
      setConnectionError(''); setPage('home')
      return { ok: true }
    } catch (error) { return { ok: false, error: error.message } }
  }
  const signIn = ({ email, password }) => authenticate('/api/auth/login', { email, password })
  const signUp = details => authenticate('/api/auth/register', details)
  const signOut = async () => { if (session?.token) api('/api/auth/logout', { token: session.token, method: 'POST' }).catch(() => {}); localStorage.removeItem('bluevault-token'); setSession(null); setAccounts([]); setSharedDepositAddresses({}); setSelected(null); setPage('home'); setDialog(null) }
  const nav = id => { setSelected(null); setPage(id) }
  const actions = (action, asset = null) => {
    setNotice(false)
    if (action === 'send' || action === 'receive') setDialog({ type: action, asset })
    else if (action === 'withdraw') setDialog({ type: 'withdraw', asset })
    else if (action === 'connect' && walletConnectEnabled) setDialog({ type: 'connect' })
    else if (action === 'buy') setPage('funding')
    else if (action === 'swap') setDialog({ type: 'placeholder', title: 'Swap crypto', description: 'A simpler way to exchange digital assets is on its way.' })
  }
  if (!authReady) return <div className="app-shell grid min-h-screen place-items-center"><p className="muted text-sm">Connecting to Bluevault…</p></div>
  if (!session) return <Auth onSignIn={signIn} onSignUp={signUp} initialError={connectionError}/>
  if (session.role === 'user' && currentUser?.status !== 'approved') return <AccountPending user={currentUser} onSignOut={signOut}/>

  const main = session.role === 'admin' ? <AdminDashboard accounts={accounts} sharedDepositAddresses={sharedDepositAddresses} onSaveSharedDepositAddresses={saveSharedDepositAddresses} adminActivity={adminActivity} adminAlerts={adminAlerts} onLoadActivity={loadAdminActivity} onLoadAlerts={loadAdminAlerts} onSendAlert={sendAlert} onEditAlert={editAlert} onDeleteAlert={deleteAlert} onDeleteUser={deleteUser} onUpdate={updateAccount} onUpdateMany={updateAccountFields} onSetUserStatus={setAccountStatus} onSendToken={sendToken} walletConnectEnabled={walletConnectEnabled} onToggleWalletConnect={() => setWalletConnectEnabled(value => !value)} onSignOut={signOut}/> : selected ? <AssetDetails asset={selected} assets={assets} balance={balance} currency={currency} exchangeRate={exchange.rate} rateDate={exchange.date} onCurrencyChange={changeCurrency} transactions={transactions} onBack={() => setSelected(null)} onAction={actions}/> : page === 'funding' ? <Funding user={currentUser} onPayFee={payFee} onBuy={buyToken}/> : page === 'activity' ? <Activity transactions={loaded ? transactions : []} assets={assets}/> : page === 'profile' ? <Profile dark={dark} onToggleTheme={() => setDark(!dark)} user={currentUser} onSignOut={signOut} onSavePin={pinHash => updateAccount(currentUser.id, 'pinHash', pinHash)}/> : <Dashboard assets={loaded ? assets : []} transactions={loaded ? transactions : []} balance={balance} currency={currency} exchangeRate={exchange.rate} rateDate={exchange.date} onCurrencyChange={changeCurrency} onAction={actions} onAsset={asset => setSelected(asset)} onPage={nav} connectEnabled={walletConnectEnabled}/>
  return <div className={`app-shell min-h-screen ${dark ? 'dark' : ''}`}><BottomNavigation page={selected ? 'portfolio' : page} setPage={nav} role={session.role} onSignOut={signOut}/><div className="mx-auto max-w-[1460px] lg:pl-[238px]"><div className="mx-auto max-w-[1180px] px-4 sm:px-7 lg:px-10">{connectionError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{connectionError}</p>}{session.role === 'admin' ? <header className="flex h-[75px] items-center justify-between sm:h-[86px]"><div><p className="muted text-[11px]">Administration</p><h1 className="mt-0.5 font-display text-lg font-bold sm:text-[21px]">Good morning, Admin</h1></div><button onClick={() => setDark(!dark)} aria-label="Toggle theme" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button></header> : <Header dark={dark} userName={currentUser?.name || 'there'} onToggleTheme={() => setDark(!dark)} onNotifications={toggleNotifications} hasNotifications={alerts.length > 0}/>} {notice && <section aria-label="Notifications" className="surface soft-shadow animate-in relative mt-2 rounded-2xl p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><Bell size={17}/></span><span className="flex-1"><span className="block text-sm font-semibold">Notifications</span><span className="muted mt-1 block text-xs">Alerts from your Bluevault administrator.</span></span><button aria-label="Close notifications" onClick={() => setNotice(false)}><X className="muted" size={17}/></button></div><div className="mt-3 divide-y divide-[var(--border)]">{alerts.length ? alerts.map(alert => <article key={alert.id} className="py-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{alert.title}</h3><time className="muted shrink-0 text-[10px]">{new Date(alert.createdAt).toLocaleString()}</time></div><p className="muted mt-1 whitespace-normal text-xs leading-relaxed">{alert.message}</p></article>) : <p className="muted py-5 text-center text-xs">You're all caught up. No alerts yet.</p>}</div></section>}{main}</div></div>
    {dialog?.type === 'send' && <SendModal assets={assets} initialAsset={dialog.asset} onSend={({ ticker, amount }) => recordActivity({ ticker, amount, type: 'sent', title: `Sent ${ticker}` })} onClose={() => setDialog(null)}/>}
    {dialog?.type === 'withdraw' && <WithdrawModal assets={assets} initialAsset={dialog.asset} fee={currentUser?.fee} feeTitle={currentUser?.feeTitle} feeDescription={currentUser?.feeDescription} feeDue={currentUser?.feeStatus === 'due' && Number(currentUser.fee) > 0} onPayFee={() => { setDialog(null); setPage('funding') }} onWithdraw={({ ticker, amount, method }) => recordActivity({ ticker, amount, type: 'sold', title: `Withdrawal via ${method}` })} onClose={() => setDialog(null)}/>}
    {dialog?.type === 'receive' && currentUser && <ReceiveModal assets={assets} initialAsset={dialog.asset} user={currentUser} assignedAddress={currentUser.depositAddress} assignedAsset={currentUser.depositAsset} assignedNetwork={currentUser.network} onClose={() => setDialog(null)}/>}
    {dialog?.type === 'connect' && currentUser && <ConnectWalletModal connectedAddress={currentUser.connectedWalletAddress} connectedNetwork={currentUser.connectedWalletNetwork} onConnect={(address, network) => { updateAccount(currentUser.id, 'connectedWalletAddress', address); updateAccount(currentUser.id, 'connectedWalletNetwork', network) }} onDisconnect={() => { updateAccount(currentUser.id, 'connectedWalletAddress', ''); updateAccount(currentUser.id, 'connectedWalletNetwork', '') }} onClose={() => setDialog(null)}/>}
    {dialog?.type === 'placeholder' && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null) }}><div className="surface animate-in w-full max-w-sm rounded-[26px] p-7 text-center shadow-2xl"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"><Moon size={21}/></span><h2 className="mt-4 font-display text-xl font-bold">{dialog.title}</h2><p className="muted mt-2 text-sm leading-relaxed">{dialog.description}</p><button onClick={() => setDialog(null)} className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Got it</button></div></div>}
  </div>
}
