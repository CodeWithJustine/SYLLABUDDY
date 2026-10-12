import { useEffect, useState } from 'react'

function getInitialTheme() {
  try {
    return localStorage.getItem('syllabuddy_theme') === 'dark'
  } catch {
    return false
  }
}

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)

    try {
      localStorage.setItem(
        'syllabuddy_theme',
        darkMode ? 'dark' : 'light'
      )
    } catch {
      // The toggle still works for the current page.
    }
  }, [darkMode])

  return (
    <button
      type="button"
      onClick={() => setDarkMode((current) => !current)}
      aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
      aria-pressed={darkMode}
      title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-blue-900"
    >
      <span aria-hidden="true">{darkMode ? '☀️' : '🌙'}</span>
      <span className="hidden sm:inline">
        {darkMode ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  )
}
