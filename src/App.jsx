import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import AuthPage from './components/AuthPage'
import LegacyImport from './components/LegacyImport'
import NotificationCenter from './components/NotificationCenter'
import OwlMascot from './components/OwlMascot'
import PasswordUpdatePage from './components/PasswordUpdatePage'
import PrivacyPolicy from './components/PrivacyPolicy'
import StudyHub from './components/StudyHub'
import TaskDetailsModal from './components/TaskDetailsModal'
import ThemeToggle from './components/ThemeToggle'
import TaskForm from './TaskForm'
import TaskCard from './TaskCard'
import { isSupabaseConfigured } from './lib/supabase'
import { formatZonedDateTime, localDateTimeToISO } from './lib/dates'
import {
  createTask,
  listTasks,
  removeTask,
  subscribeToTasks,
  updateTask,
} from './lib/tasks'
import './index.css'

const tabs = [
  { id: 'active', label: 'Active Quests', icon: '◈' },
  { id: 'completed', label: 'Completed', icon: '✓' },
  { id: 'missed', label: 'Missed', icon: '!' },
]

export default function App() {
  const { loading } = useAuth()

  if (!isSupabaseConfigured) return <ConfigurationNotice />
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600 dark:text-slate-300">
        Restoring your secure session…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthRoute />} />
      <Route path="/reset-password" element={<PasswordUpdatePage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/study" element={<StudyHubRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ConfigurationNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5 dark:bg-slate-950">
      <section className="max-w-xl rounded-2xl border border-amber-300 bg-white p-6 shadow-lg dark:border-amber-900 dark:bg-slate-900">
        <h1 className="text-2xl font-extrabold">Finish Supabase setup</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in your
          Supabase project URL and publishable/anon key, then run the SQL
          migration in <code>supabase/migrations</code>. Never put a service-role
          key in a <code>VITE_</code> variable.
        </p>
      </section>
    </main>
  )
}

function AuthRoute() {
  const { user } = useAuth()
  const location = useLocation()
  if (user) {
    const destination = location.state?.from
    return <Navigate to={`${destination?.pathname || '/'}${destination?.search || ''}`} replace />
  }
  return <AuthPage />
}

function ProtectedLayout() {
  const { user, profile, profileError, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [accountOpen, setAccountOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine)
  const [notice, setNotice] = useState('')
  const onNotificationError = useCallback((message) => setNotice(message), [])

  useEffect(() => {
    const onOnline = () => setNetworkOnline(true)
    const onOffline = () => setNetworkOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      setSignOutError(error.message)
    }
  }

  const displayName =
    profile?.display_name?.trim() || user.email?.split('@')[0] || 'Student'

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg">
            <OwlMascot className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Sylla<span className="text-blue-600">Buddy</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/study"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
              }
            >
              <BookOpen size={16} /> Study Hub
            </NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 text-xs text-slate-500 md:inline-flex" title={networkOnline ? 'Online' : 'Offline'}>
              {networkOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
              {networkOnline ? 'Online' : 'Offline'}
            </span>
            <NotificationCenter
              userId={user.id}
              profile={profile}
              updateProfile={updateProfile}
              onError={onNotificationError}
            />
            <ThemeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-label="Open account menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              >
                {displayName[0].toUpperCase()}
              </button>
              {accountOpen && (
                <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="flex justify-center gap-2 border-t border-slate-100 px-3 py-2 sm:hidden dark:border-slate-800">
          <NavLink to="/" end className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>Dashboard</NavLink>
          <NavLink to="/study" className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>Study Hub</NavLink>
        </nav>
      </header>
      {signOutError && <p role="alert" className="mx-auto max-w-7xl px-4 pt-3 text-sm text-red-600">{signOutError}</p>}
      {(notice || profileError) && (
        <div role="status" className="mx-auto flex max-w-7xl justify-between px-4 pt-3 text-sm text-amber-700 dark:text-amber-300">
          <span>{notice || `Could not load your profile: ${profileError}`}</span>
          {notice && <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">Dismiss</button>}
        </div>
      )}
      <Outlet />
    </div>
  )
}

function StudyHubRoute() {
  const { user } = useAuth()
  return <StudyHub userId={user.id} />
}

function DashboardPage() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [selectedTaskManual, setSelectedTaskManual] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestNumber = useRef(0)
  const taskSubmitInProgress = useRef(false)
  const timezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const taskFromNotification = tasks.find((task) => task.id === searchParams.get('task'))
  const selectedTask = taskFromNotification ?? selectedTaskManual

  const refreshTasks = useCallback(async () => {
    const requestId = ++requestNumber.current
    const nextTasks = await listTasks()
    if (requestId === requestNumber.current) setTasks(nextTasks)
  }, [])

  // Auto-mark overdue active tasks as missed
  const autoMarkMissed = useCallback(async (currentTasks) => {
    const now = new Date()
    const overdue = currentTasks.filter(
      (t) => t.status === 'active' && new Date(t.due_at) < now
    )
    if (overdue.length === 0) return
    await Promise.allSettled(
      overdue.map((t) =>
        updateTask(t.id, { status: 'missed' }, t.updated_at).then((updated) => {
          requestNumber.current += 1
          setTasks((current) =>
            current.map((task) => (task.id === updated.id ? updated : task))
          )
        })
      )
    )
  }, [])

  useEffect(() => {
    let mounted = true
    const initialRequest = requestNumber.current
    listTasks()
      .then((nextTasks) => {
        if (mounted && initialRequest === requestNumber.current) setTasks(nextTasks)
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Could not load tasks.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const unsubscribe = subscribeToTasks(
      user.id,
      (payload) => {
        if (!mounted) return
        requestNumber.current += 1
        if (payload.eventType === 'DELETE') {
          setTasks((current) => current.filter((task) => task.id !== payload.old.id))
        } else {
          setTasks((current) => {
            const withoutTask = current.filter((task) => task.id !== payload.new.id)
            return [...withoutTask, payload.new].sort(
              (a, b) => new Date(a.due_at) - new Date(b.due_at)
            )
          })
        }
      },
      (syncLoadError) => setSyncError(syncLoadError.message)
    )

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [user.id])

  // Sweep for overdue tasks on load and every minute
  useEffect(() => {
    if (loading) return
    autoMarkMissed(tasks)
    const interval = setInterval(() => {
      setTasks((current) => { autoMarkMissed(current); return current })
    }, 60_000)
    return () => clearInterval(interval)
  }, [loading, autoMarkMissed])

  const onSubmitTask = useCallback(async (taskData) => {
    if (taskSubmitInProgress.current) {
      throw new Error('Your task is still being saved.')
    }
    const dueAt = new Date(localDateTimeToISO(taskData.dueDate, timezone))
    if (dueAt <= new Date()) {
      throw new Error('Choose a valid future deadline.')
    }
    taskSubmitInProgress.current = true
    setSaving(true)
    setError('')
    try {
      const created = await createTask(user.id, {
        ...taskData,
        dueAt: dueAt.toISOString(),
      })
      requestNumber.current += 1
      setTasks((current) => [created, ...current].sort((a, b) => new Date(a.due_at) - new Date(b.due_at)))
      setActiveTab('active')
    } catch (saveError) {
      setError(saveError.message || 'Could not save this task.')
      throw saveError
    } finally {
      taskSubmitInProgress.current = false
      setSaving(false)
    }
  }, [user.id, timezone])

  const onStatusChange = useCallback(async (taskId, status, expectedUpdatedAt) => {
    setError('')
    const changes = {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    }
    const updated = await updateTask(taskId, changes, expectedUpdatedAt)
    requestNumber.current += 1
    setTasks((current) => current.map((task) => task.id === taskId ? updated : task))
    return updated
  }, [])

  const onUpdateTask = useCallback(async (taskId, changes, expectedUpdatedAt) => {
    if (new Date(changes.due_at) <= new Date()) {
      throw new Error('Choose a future deadline.')
    }
    const updated = await updateTask(taskId, changes, expectedUpdatedAt)
    requestNumber.current += 1
    setTasks((current) => current.map((task) => task.id === taskId ? updated : task))
    return updated
  }, [])

  const onDeleteTask = useCallback(async (taskId, expectedUpdatedAt) => {
    await removeTask(taskId, expectedUpdatedAt)
    requestNumber.current += 1
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }, [])
  const closeTaskDetails = useCallback(() => {
    setSelectedTaskManual(null)
    if (searchParams.has('task')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('task')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const counts = useMemo(() => ({
    active: tasks.filter((task) => task.status === 'active').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    missed: tasks.filter((task) => task.status === 'missed').length,
  }), [tasks])
  const visibleTasks = tasks.filter((task) => task.status === activeTab)
  const upcomingTasks = tasks
    .filter((task) => task.status === 'active' && new Date(task.due_at) >= new Date())
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 3)

  const firstName =
    profile?.display_name?.trim() || user.email?.split('@')[0] || 'Student'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="mb-7 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">Your student dashboard</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting}, {firstName}!</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Ready for your next quest? Keep your semester moving, one step at a time.
          </p>
        </div>
        <OwlMascot className="hidden h-20 w-20 shrink-0 sm:block md:h-28 md:w-28" />
      </section>

      {(error || syncError) && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error || `Live sync issue: ${syncError}`}
          <button type="button" onClick={() => { setError(''); setSyncError('') }} className="ml-3 font-bold underline">Dismiss</button>
        </div>
      )}

      <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">Add a new quest</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Got a deadline? Put it on your radar.</p>
        </div>
        <TaskForm onAddTask={onSubmitTask} saving={saving} timezone={timezone} />
      </section>

      <section aria-label="Task overview" className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <OverviewCard label="Active Quests" value={counts.active} icon="◈" color="blue" description="Tasks in progress" />
        <OverviewCard label="Completed" value={counts.completed} icon="✓" color="green" description={`${tasks.length ? Math.round((counts.completed / tasks.length) * 100) : 0}% of all tasks completed`} />
        <OverviewCard label="Missed" value={counts.missed} icon="!" color="red" description="Tasks marked as missed" />
      </section>

      <LegacyImport userId={user.id} onImported={refreshTasks} />

      <section className="mb-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Your quests</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your academic workload in one place.</p>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} total</span>
        </div>
        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Task status">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={selected}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${selected ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
              >
                <span aria-hidden="true">{tab.icon}</span>{tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{counts[tab.id]}</span>
              </button>
            )
          })}
        </div>
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your synced quests…</div>
        ) : visibleTasks.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} timezone={timezone} onOpen={setSelectedTaskManual} onStatusChange={onStatusChange} onDelete={onDeleteTask} onError={setError} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500 dark:bg-slate-800">{tabs.find((tab) => tab.id === activeTab)?.icon}</div>
            <h3 className="font-bold">{activeTab === 'active' ? 'No active quests yet' : activeTab === 'completed' ? 'Nothing completed yet' : 'No missed tasks'}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{activeTab === 'active' ? 'Add your first assignment, project, or exam below.' : 'Tasks you move to this status will appear here.'}</p>
          </div>
        )}
      </section>

      <section className="mb-7 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-bold">Upcoming deadlines</h2>
          {upcomingTasks.length ? (
            <ul className="mt-3 space-y-3">
              {upcomingTasks.map((task) => <li key={task.id} className="flex items-start justify-between gap-3 text-sm"><button type="button" onClick={() => setSelectedTaskManual(task)} className="text-left font-semibold text-blue-700 hover:underline dark:text-blue-300">{task.name}<span className="block font-normal text-slate-500">{task.subject}</span></button><time className="shrink-0 text-right text-xs text-slate-500">{formatZonedDateTime(task.due_at, timezone)}</time></li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">No upcoming active deadlines.</p>}
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <div>
            <h2 className="font-bold">Make time to learn</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Practice active recall, spaced repetition, Feynman explanations, Pomodoro focus, and mixed-topic study.</p>
          </div>
          <Link to="/study" className="mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Open Study Hub <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="py-5 text-center text-xs text-slate-400">
        <PrivacyPolicy />
        <p className="mt-2">SyllaBuddy · Your academic journey, synced securely.</p>
      </footer>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          timezone={timezone}
          onClose={closeTaskDetails}
          onStatusChange={onStatusChange}
          onDelete={onDeleteTask}
          onUpdate={onUpdateTask}
        />
      )}
    </main>
  )
}

function OverviewCard({ label, value, icon, color, description }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900',
    green: 'bg-green-50 text-green-700 ring-green-100 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-900',
    red: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ring-1 ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}
