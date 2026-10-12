
import { useState } from 'react'
import OwlMascot from './OwlMascot'

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState('signup')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const cleanUsername = username.trim()

    if (cleanUsername.length < 2) {
      setError('Please enter at least 2 characters.')
      return
    }

    if (cleanUsername.length > 24) {
      setError('Your username must be 24 characters or fewer.')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError('Use only letters, numbers, underscores, or hyphens.')
      return
    }

    onLogin(cleanUsername, mode)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <OwlMascot className="mx-auto h-36 w-36 sm:h-44 sm:w-44" />

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
            Sylla<span className="text-blue-600">Buddy</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your academic quests, all in one place.
          </p>

          <p className="mt-4 text-sm font-medium text-blue-600">
            ✦ Small steps, big dreams! ✦
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {mode === 'signup' ? 'Create your account' : 'Welcome back!'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {mode === 'signup'
                ? 'Choose a username to start your academic journey.'
                : 'Enter your username to continue your journey.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                minLength={2}
                maxLength={24}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setError('')
                }}
                placeholder="e.g. StudyBuddy123"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-900"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:shadow-none"
            >
              {mode === 'signup'
                ? '✦ Create Account'
                : '→ Sign In'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {mode === 'signup'
                ? 'Already have an account?'
                : 'New to SyllaBuddy?'}
            </p>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup')
                setError('')
              }}
              className="mt-2 font-semibold text-blue-600 hover:text-blue-700"
            >
              {mode === 'signup'
                ? 'Sign in instead'
                : 'Create a new account'}
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your progress is saved locally in this browser.
        </p>
      </div>
    </main>
  )
}
