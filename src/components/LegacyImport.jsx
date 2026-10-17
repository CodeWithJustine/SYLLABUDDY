import { useMemo, useState } from 'react'
import { importLegacyTasks } from '../lib/tasks'

export default function LegacyImport({ userId, onImported }) {
  const legacyAccounts = useMemo(() => {
    const prefix = 'syllabuddy_tasks_'
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .filter(Boolean)
  }, [])
  const [username, setUsername] = useState(legacyAccounts[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (legacyAccounts.length === 0) return null

  async function handleImport() {
    if (!username) return
    if (!window.confirm(`Import tasks saved for "${username}" into your signed-in account? The old local copy will remain in this browser.`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const count = await importLegacyTasks(userId, username)
      setMessage(`${count} task${count === 1 ? '' : 's'} imported.`)
      await onImported()
    } catch (importError) {
      setError(importError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
      <summary className="cursor-pointer font-semibold text-blue-900 dark:text-blue-200">
        Import tasks from this browser
      </summary>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Choose your old local account. Only its task history is copied; mock passwords and accounts are never imported.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="legacy-account">Old local account</label>
        <select id="legacy-account" value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {legacyAccounts.map((account) => <option key={account} value={account}>{account}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={handleImport} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">
          {busy ? 'Importing…' : 'Import task history'}
        </button>
      </div>
      {message && <p role="status" className="mt-2 text-green-800 dark:text-green-300">{message}</p>}
      {error && <p role="alert" className="mt-2 text-red-700 dark:text-red-300">{error}</p>}
    </details>
  )
}
