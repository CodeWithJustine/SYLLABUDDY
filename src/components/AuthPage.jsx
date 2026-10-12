import { useState } from 'react'
import { loginUser, registerUser } from '../utils/storage'
import OwlMascot from './OwlMascot'
import PrivacyPolicy from './PrivacyPolicy'
import ThemeToggle from './ThemeToggle'

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const session =
        mode === 'register'
          ? await registerUser(username, password)
          : await loginUser(username, password)

      onLogin(session)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
  }

  return (
    <>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl dark:bg-blue-900/20" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-900/20" />

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <section className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <OwlMascot size={142} className="mx-auto drop-shadow-lg" />

          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Sylla<span className="text-blue-600">Buddy</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your academic quests, all in one place.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold">
              {mode === 'register'
                ? 'Create your account'
                : 'Welcome back!'}
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'register'
                ? 'Start organizing your semester today.'
                : 'Sign in to continue your academic journey.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setError('')
                }}
                placeholder="e.g. studybuddy01"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="Use letters, numbers, or underscores."
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900/50"
              />
              <p className="mt-1 text-xs text-slate-400">
                3–20 letters, numbers, or underscores.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'register'
                    ? 'new-password'
                    : 'current-password'
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900/50"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60 dark:shadow-none"
            >
              {busy
                ? 'Please wait...'
                : mode === 'register'
                  ? '✦ Create Account'
                  : '→ Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === 'register'
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}

            <button
              type="button"
              onClick={() =>
                switchMode(
                  mode === 'register' ? 'login' : 'register'
                )
              }
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
            >
              {mode === 'register' ? 'Sign in' : 'Register'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          Your progress is saved locally in this browser.
          <br />
          Demo authentication — not for sensitive accounts.
          <br />
          <PrivacyPolicy />
        </p>
        </section>
      </main>

      <div className="bg-slate-50 transition-colors dark:bg-slate-950">
        <footer className="pb-8 text-center text-xs text-slate-400">
          SyllaBuddy · Your academic journey, saved locally.
        </footer>
      </div>
    </>
  )
}
