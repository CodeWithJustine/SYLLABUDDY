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

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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

      <div className="mt-5 border-t border-slate-100 pt-4">
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
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
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
