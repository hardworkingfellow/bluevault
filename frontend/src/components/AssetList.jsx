import React from 'react'
import AssetCard from './AssetCard.jsx'
export default function AssetList({ assets, onSelect, title = 'Your assets', currency = 'USD', exchangeRate = 1 }) {
  return <section><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-[15px] font-bold">{title}</h3><span className="muted text-xs">{assets.length} assets</span></div><div className="space-y-2.5">{assets.length ? assets.map(asset => <AssetCard key={asset.id} asset={asset} currency={currency} exchangeRate={exchangeRate} onClick={() => onSelect(asset)}/>) : <div className="surface rounded-2xl px-4 py-8 text-center"><span className="muted text-sm">Your assets will appear here.</span></div>}</div></section>
}
