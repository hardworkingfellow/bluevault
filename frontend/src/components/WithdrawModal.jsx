import React, { useState } from 'react'
import { ArrowDownToLine, Check, ChevronDown, CreditCard, MapPin, WalletCards, X } from 'lucide-react'
import { CoinIcon } from './AssetCard.jsx'
import WithdrawalFeeGate from './WithdrawalFeeGate.jsx'

const field = 'w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'
const methods = [
  { id: 'cash', label: 'Cash mailing', detail: 'Mail a cash payout', icon: MapPin },
  { id: 'bank', label: 'Bank transfer', detail: 'Deposit to your bank', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', detail: 'Send to a wallet address', icon: WalletCards },
]

export default function WithdrawModal({ assets, initialAsset, fee, feeTitle, feeDescription, feeDue, onPayFee, onWithdraw, onClose }) {
  const availableAssets = assets.filter(asset => asset.amount > 0)
  const [assetId, setAssetId] = useState(initialAsset?.id || availableAssets[0]?.id || '')
  const [method, setMethod] = useState('wallet')
  const [amount, setAmount] = useState('')
  const [fields, setFields] = useState({ recipient: '', address: '', bank: '', accountName: '', accountNumber: '', street: '', city: '', region: '', postal: '', country: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [feeGateOpen, setFeeGateOpen] = useState(false)
  const asset = availableAssets.find(item => item.id === assetId)
  const update = (name, value) => setFields(previous => ({ ...previous, [name]: value }))
  const submit = async event => {
    event.preventDefault()
    const quantity = Number(amount)
    if (!asset) return setError('You do not have an available asset to withdraw.')
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('Enter an amount greater than zero.')
    if (quantity > asset.amount) return setError('Amount exceeds your available balance.')
    if (method === 'wallet' && fields.address.trim().length < 26) return setError('Enter a valid wallet address (at least 26 characters).')
    if (method === 'bank' && (!fields.bank.trim() || !fields.accountName.trim() || fields.accountNumber.trim().length < 4)) return setError('Enter the bank, account holder, and account number.')
    if (method === 'cash' && (!fields.recipient.trim() || !fields.street.trim() || !fields.city.trim() || !fields.country.trim())) return setError('Complete the recipient name and mailing address.')
    if (feeDue) return setFeeGateOpen(true)
    setError('')
    const result = await onWithdraw({ ticker: asset.ticker, amount: quantity, method })
    if (!result.ok) return setError(result.error)
    setDone(true)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <section className="surface animate-in max-h-[92vh] w-full max-w-[500px] overflow-y-auto rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
        {done ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Check size={30}/></span>
            <h2 className="mt-5 font-display text-xl font-bold">Withdrawal request ready</h2>
            <p className="muted mx-auto mt-2 max-w-xs text-sm leading-relaxed">Your request to withdraw {amount} {asset.ticker} via {methods.find(item => item.id === method)?.label} is ready. No funds were moved.</p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">Done</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Withdraw</h2>
                <p className="muted mt-1 text-xs">Choose how you’d like to receive your funds.</p>
              </div>
              <button aria-label="Close dialog" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-soft)]"><X size={18}/></button>
            </div>
            {availableAssets.length === 0 ? (
              <div className="rounded-2xl bg-[var(--surface-soft)] px-5 py-10 text-center">
                <span className="muted mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface)]"><ArrowDownToLine size={19}/></span>
                <p className="mt-3 text-sm font-semibold">No funds available to withdraw</p>
                <p className="muted mt-1 text-xs">Your wallet needs an asset balance before you can create a withdrawal.</p>
                <button onClick={onClose} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white">Close</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold">Asset</span>
                  <span className="flex min-w-0 items-center gap-3 rounded-xl bg-[var(--surface-soft)] p-3">
                    <CoinIcon asset={asset || availableAssets[0]}/>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{asset?.name || 'Select asset'}</span>
                      <span className="muted mt-0.5 block text-xs">Available: {asset?.amount.toLocaleString() || 0} {asset?.ticker}</span>
                    </span>
                    <span className="relative">
                      <select aria-label="Select withdrawal asset" value={assetId} onChange={event => setAssetId(event.target.value)} className="max-w-[100px] appearance-none bg-transparent py-2 pl-2 pr-6 text-right text-xs font-semibold outline-none">
                        {availableAssets.map(item => <option key={item.id} value={item.id}>{item.ticker}</option>)}
                      </select>
                      <ChevronDown className="muted pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" size={14}/>
                    </span>
                  </span>
                </label>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold">Withdrawal method</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {methods.map(({ id, label, detail, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => { setMethod(id); setError(''); if (feeDue) setFeeGateOpen(true) }}
                        className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition sm:block sm:p-3 ${method === id ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100' : 'border-[var(--border)] hover:bg-[var(--surface-soft)]'}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${method === id ? 'bg-white/80 text-blue-600 dark:bg-blue-900/60 dark:text-blue-200' : 'bg-[var(--surface-soft)] text-[var(--blue)]'}`}><Icon size={17}/></span>
                        <span className="min-w-0 sm:mt-2 sm:block">
                          <span className="block truncate text-xs font-semibold">{label}</span>
                          <span className="muted mt-0.5 block text-[10px]">{detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {method === 'wallet' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold">Destination wallet address</span>
                    <input value={fields.address} onChange={event => update('address', event.target.value)} placeholder="Enter destination address" autoComplete="off" className={field}/>
                  </label>
                )}
                {method === 'bank' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Bank name</span><input value={fields.bank} onChange={event => update('bank', event.target.value)} placeholder="Bank name" className={field}/></label>
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Account holder</span><input value={fields.accountName} onChange={event => update('accountName', event.target.value)} placeholder="Full name" className={field}/></label>
                    <label className="block min-w-0 sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Account number</span><input value={fields.accountNumber} onChange={event => update('accountNumber', event.target.value)} inputMode="numeric" placeholder="Account number" className={field}/></label>
                  </div>
                )}
                {method === 'cash' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block min-w-0 sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Recipient full name</span><input value={fields.recipient} onChange={event => update('recipient', event.target.value)} placeholder="Name for delivery" className={field}/></label>
                    <label className="block min-w-0 sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Street address</span><input value={fields.street} onChange={event => update('street', event.target.value)} placeholder="Street address" className={field}/></label>
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">City</span><input value={fields.city} onChange={event => update('city', event.target.value)} placeholder="City" className={field}/></label>
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">State / region</span><input value={fields.region} onChange={event => update('region', event.target.value)} placeholder="State / region" className={field}/></label>
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Postal code</span><input value={fields.postal} onChange={event => update('postal', event.target.value)} placeholder="Postal code" className={field}/></label>
                    <label className="block min-w-0"><span className="mb-2 block text-xs font-semibold">Country</span><input value={fields.country} onChange={event => update('country', event.target.value)} placeholder="Country" className={field}/></label>
                  </div>
                )}
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold">Amount</span>
                  <span className="flex min-w-0 items-center rounded-xl border border-[var(--border)] px-3.5 focus-within:border-blue-400">
                    <input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="0" step="any" placeholder="0.00" className="w-full min-w-0 bg-transparent py-3 text-lg font-semibold outline-none"/>
                    <span className="muted shrink-0 text-xs">{asset?.ticker}</span>
                  </span>
                  <span className="muted mt-1.5 block text-right text-[10px]">Network fee estimate: $1.24</span>
                </label>
                {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"><ArrowDownToLine size={17}/> Continue</button>
                <p className="muted text-center text-[10px]">This preview does not move funds or submit bank or cash payments.</p>
              </form>
            )}
          </>
        )}
      </section>
      {feeGateOpen && <WithdrawalFeeGate fee={fee} title={feeTitle} description={feeDescription} onPay={onPayFee} onClose={() => setFeeGateOpen(false)}/>}
    </div>
  )
}
