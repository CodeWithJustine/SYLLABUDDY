import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import OwlMascot from './OwlMascot'
import PrivacyPolicy from './PrivacyPolicy'
import ThemeToggle from './ThemeToggle'

export default function AuthPage() {
  const { authError } = useAuth()
  const [mode, setMode] = useState('register')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    try {
      if (!supabase) throw new Error('Supabase is not configured.')

      const result =
        mode === 'register'
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: {
                  display_name: displayName.trim(),
                  timezone:
                    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                },
              },
            })
          : await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })

      if (result.error) throw result.error
      if (mode === 'register' && !result.data.session) {
        setNotice('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePasswordReset() {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Enter your email address first so we can send a reset link.')
      return
    }

    setBusy(true)
    try {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetError) throw resetError
      setNotice('If an account exists for that email, a reset link is on its way.')
    } catch (err) {
      setError(err.message || 'We could not send the reset email.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 transition-colors dark:bg-slate-950">
      <main className="auth-page-main relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 text-slate-800 dark:text-slate-100">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl dark:bg-blue-900/20" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-900/20" />
        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <section className="auth-page-content relative w-full max-w-md">
          <div className="auth-page-header mb-7 text-center">
            <OwlMascot className="auth-page-mascot mx-auto h-10 w-10 shrink-0 drop-shadow-lg sm:h-[70px] sm:w-[70px]" />
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Sylla<span className="text-blue-600">Buddy</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Your academic quests, all in one place.
            </p>
          </div>

          <div className="auth-page-card rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
            <div className="auth-page-intro mb-6">
              <h2 className="text-2xl font-extrabold">
                {mode === 'register' ? 'Create your account' : 'Welcome back!'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {mode === 'register'
                  ? 'Use your email to keep your academic journey in sync.'
                  : 'Sign in to continue your academic journey.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-page-form space-y-5">
              {mode === 'register' && (
                <div>
                  <label htmlFor="display-name" className="mb-2 block text-sm font-semibold">
                    Display name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900/50"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900/50"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900/50"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}
              {authError && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {authError}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60 dark:shadow-none"
              >
                {busy ? 'Please wait...' : mode === 'register' ? '✦ Create Account' : '→ Sign In'}
              </button>
            </form>

            {mode === 'login' && (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={busy}
                className="mt-4 w-full text-center text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot password?
              </button>
            )}

            <div className="auth-page-switch mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
              >
                {mode === 'register' ? 'Sign in' : 'Register'}
              </button>
            </div>
          </div>

          <p className="auth-page-note mt-5 text-center text-xs leading-5 text-slate-400">
            Your tasks sync securely to your account.
            <br />
            <PrivacyPolicy />
          </p>
        </section>
      </main>
      <footer className="auth-page-footer shrink-0 pb-2 pt-1 text-center text-xs text-slate-400">
        SyllaBuddy · Your academic journey, saved securely.
      </footer>
    </div>
  )
}
