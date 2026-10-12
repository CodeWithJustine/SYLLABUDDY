
import { useEffect, useState } from 'react'
import AuthPage from './components/AuthPage'
import OwlMascot from './components/OwlMascot'
import PrivacyPolicy from './components/PrivacyPolicy'
import ThemeToggle from './components/ThemeToggle'
import TaskForm from './TaskForm'
import TaskCard from './TaskCard'
import { getSession, getTasks, logoutUser, saveTasks } from './utils/storage'
import './index.css'

const tabs = [
  { id: 'active', label: 'Active Quests', icon: '◈' },
  { id: 'completed', label: 'Completed', icon: '✓' },
  { id: 'missed', label: 'Missed', icon: '!' },
]

export default function App() {
  const [username, setUsername] = useState(() => getSession()?.username ?? '')
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    if (!username) {
      setTasks([])
      return
    }

    setTasks(getTasks(username))
  }, [username])

  useEffect(() => {
    if (!username) return

    saveTasks(username, tasks)
  }, [username, tasks])

  function handleLogin(session) {
    const accountName = session?.username

    if (!accountName) return

    setUsername(accountName)
    setActiveTab('active')
  }

  function handleLogout() {
    logoutUser()
    setUsername('')
    setTasks([])
    setActiveTab('active')
  }

  function addTask(taskData) {
    const newTask = {
      id: crypto.randomUUID(),
      name: taskData.name.trim(),
      subject: taskData.subject.trim(),
      dueDate: taskData.dueDate,
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    setTasks((current) => [newTask, ...current])
    setActiveTab('active')
  }

  function updateTaskStatus(id, status) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status } : task
      )
    )
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  const visibleTasks = tasks.filter((task) => task.status === activeTab)

  const counts = {
    active: tasks.filter((task) => task.status === 'active').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    missed: tasks.filter((task) => task.status === 'missed').length,
  }

  const totalTasks = tasks.length
  const completionRate = totalTasks
    ? Math.round((counts.completed / totalTasks) * 100)
    : 0

  if (!username) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <OwlMascot className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />

            <div className="min-w-0">
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
                Sylla<span className="text-blue-600">Buddy</span>
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Welcome, {username}!
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="hidden sm:inline">Log out</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
              Your student dashboard
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Conquer your semester.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
              Keep your assignments, projects, and exams organized. One quest at a time.
            </p>
          </div>

          <OwlMascot className="hidden h-24 w-24 shrink-0 sm:block md:h-32 md:w-32" />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <OverviewCard
            label="Active Quests"
            value={counts.active}
            icon="◈"
            color="blue"
            description="Tasks in progress"
          />

          <OverviewCard
            label="Completed"
            value={counts.completed}
            icon="✓"
            color="green"
            description={`${completionRate}% of all tasks completed`}
          />

          <OverviewCard
            label="Missed"
            value={counts.missed}
            icon="!"
            color="red"
            description="Tasks marked as missed"
          />
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5">
            <h3 className="text-lg font-bold">Add a new quest</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Got a deadline? Put it on your radar.
            </p>
          </div>

          <TaskForm onAddTask={addTask} />
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Your quests</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage your academic workload in one place.
              </p>
            </div>

            <span className="text-sm text-slate-500 dark:text-slate-400">
              {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} total
            </span>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={selected}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    selected
                      ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selected
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              )
            })}
          </div>

          {visibleTasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={updateTaskStatus}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-14 text-center transition-colors dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500 dark:bg-slate-800">
                {activeTab === 'active'
                  ? '◈'
                  : activeTab === 'completed'
                    ? '✓'
                    : '!'}
              </div>

              <h4 className="font-bold">
                {activeTab === 'active'
                  ? 'No active quests yet'
                  : activeTab === 'completed'
                    ? 'Nothing completed yet'
                    : 'No missed tasks'}
              </h4>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                {activeTab === 'active'
                  ? 'Add your first assignment, project, or exam using the form above.'
                  : activeTab === 'completed'
                    ? 'Tasks you mark as done will appear here.'
                    : 'Tasks you mark as missed will appear here.'}
              </p>
            </div>
          )}
        </section>

        <footer className="py-6 text-center text-xs text-slate-400">
          <PrivacyPolicy />
          <p className="mt-2">SyllaBuddy · Your academic journey, saved locally.</p>
        </footer>
      </main>
    </div>
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
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ring-1 ${styles[color]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}
