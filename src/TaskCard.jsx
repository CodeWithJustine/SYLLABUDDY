import { useEffect, useState } from 'react'

function formatDate(dateString, timezone) {
  return dateString
    ? new Date(dateString).toLocaleString(undefined, {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No due date'
}

function getDeadlineInfo(dueAt) {
  const now = new Date()
  const due = new Date(dueAt)
  const diffMs = due - now
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffMs <= 0) return { label: 'Deadline has passed', level: 'overdue' }
  if (diffHours <= 24) {
    const h = Math.ceil(diffHours)
    return { label: `Due in ${h} hour${h === 1 ? '' : 's'} — act now!`, level: 'critical' }
  }
  if (diffDays <= 3) {
    const d = Math.ceil(diffDays)
    return { label: `Due in ${d} day${d === 1 ? '' : 's'} — coming up soon`, level: 'warning' }
  }
  return null
}

const deadlineBannerStyles = {
  overdue:  'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  critical: 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  warning:  'bg-yellow-50 text-yellow-700 border border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800',
}

const deadlineBannerIcons = {
  overdue:  '🚨',
  critical: '⚠️',
  warning:  '🕐',
}

export default function TaskCard({
  task,
  onOpen,
  onStatusChange,
  onDelete,
  onError,
  timezone,
}) {
  const isActive = task.status === 'active'
  const isCompleted = task.status === 'completed'

  // Re-compute deadline info every minute so the banner stays live
  const [deadlineInfo, setDeadlineInfo] = useState(() =>
    isActive ? getDeadlineInfo(task.due_at) : null
  )

  useEffect(() => {
    if (!isActive) { setDeadlineInfo(null); return }
    setDeadlineInfo(getDeadlineInfo(task.due_at))
    const interval = setInterval(() => {
      setDeadlineInfo(getDeadlineInfo(task.due_at))
    }, 60_000)
    return () => clearInterval(interval)
  }, [task.due_at, isActive])

  const statusStyles = {
    active: 'bg-blue-50 text-blue-700 ring-blue-100',
    completed: 'bg-green-50 text-green-700 ring-green-100',
    missed: 'bg-red-50 text-red-700 ring-red-100',
  }

  const statusLabels = {
    active: 'Active',
    completed: 'Completed',
    missed: 'Missed',
  }

  // Card border gets a red glow when critical/overdue
  const cardBorderClass =
    isActive && deadlineInfo?.level === 'critical'
      ? 'border-orange-300 ring-2 ring-orange-200 dark:border-orange-700 dark:ring-orange-900'
      : isActive && deadlineInfo?.level === 'overdue'
      ? 'border-red-300 ring-2 ring-red-200 dark:border-red-700 dark:ring-red-900'
      : 'border-slate-200 hover:border-slate-300'

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6 dark:bg-slate-900 ${cardBorderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {task.subject}
          </span>

          <h4 className="break-words text-lg font-bold text-slate-900 dark:text-white">
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="rounded text-left hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-blue-300"
            >
            {task.name}
            </button>
          </h4>

          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span aria-hidden="true">▦</span>
            Due {formatDate(task.due_at, timezone)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[task.status]}`}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      {/* Deadline urgency banner */}
      {isActive && deadlineInfo && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${deadlineBannerStyles[deadlineInfo.level]}`}>
          <span aria-hidden="true">{deadlineBannerIcons[deadlineInfo.level]}</span>
          {deadlineInfo.label}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        {isActive ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                try {
                  await onStatusChange(task.id, 'completed', task.updated_at)
                } catch (error) {
                  onError(error.message)
                }
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100"
            >
              <span aria-hidden="true">✓</span>
              Mark as Done
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await onStatusChange(task.id, 'missed', task.updated_at)
                } catch (error) {
                  onError(error.message)
                }
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 dark:bg-transparent"
            >
              <span aria-hidden="true">!</span>
              Mark as Missed
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {isCompleted
                ? 'Quest completed'
                : 'Quest marked as missed'}
            </p>

            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  `Permanently delete "${task.name}"? This cannot be undone.`
                )

                if (confirmed) {
                  try {
                    await onDelete(task.id, task.updated_at)
                  } catch (error) {
                    onError(error.message)
                  }
                }
              }}
              aria-label={`Permanently delete ${task.name}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              <span aria-hidden="true">🗑</span>
              <span>Permanently Delete</span>
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
