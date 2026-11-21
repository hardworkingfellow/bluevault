import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)

  useEffect(() => {
    const handleInstallAvailable = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setShowHelp(false)
    }

    window.addEventListener('beforeinstallprompt', handleInstallAvailable)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true)
      return
    }
    const prompt = installPrompt
    setInstallPrompt(null)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'dismissed') setInstallPrompt(null)
  }

  if (installed) return null

  return <>
    <button onClick={install} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 sm:bottom-5 sm:right-5" aria-label="Install Bluevault app">
      <Download size={17} /> Install app
    </button>
    {showHelp && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]" onMouseDown={event => { if (event.target === event.currentTarget) setShowHelp(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="install-help-title" className="surface animate-in relative w-full max-w-sm rounded-[26px] p-6 shadow-2xl">
        <button onClick={() => setShowHelp(false)} aria-label="Close install instructions" className="muted absolute right-4 top-4 rounded-full p-2 hover:bg-[var(--surface-soft)]"><X size={18} /></button>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"><Download size={20} /></span>
        <h2 id="install-help-title" className="mt-4 font-display text-lg font-bold">Install Bluevault</h2>
        <p className="muted mt-2 text-sm leading-relaxed">Open your browser menu and choose <strong className="text-[var(--text)]">Install app</strong> or <strong className="text-[var(--text)]">Add to Home Screen</strong>. On iPhone or iPad, use Safari’s Share button, then choose <strong className="text-[var(--text)]">Add to Home Screen</strong>.</p>
        <button onClick={() => setShowHelp(false)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Got it</button>
      </section>
    </div>}
  </>
}
