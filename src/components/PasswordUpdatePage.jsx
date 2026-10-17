import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PasswordUpdatePage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setComplete(true)
      window.setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (updateError) {
      setError(updateError.message || 'The password could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">SyllaBuddy</p>
        <h1 className="mt-2 text-2xl font-extrabold">Choose a new password</h1>
        {complete ? (
          <p role="status" className="mt-4 text-sm text-green-700 dark:text-green-300">Password updated. Redirecting you to your dashboard…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">New password
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <label className="block text-sm font-semibold">Confirm new password
              <input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800" />
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
        <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">Return to sign in</Link>
      </section>
    </main>
  )
}
