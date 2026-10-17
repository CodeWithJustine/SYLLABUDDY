import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTimeInput, formatZonedDateTime, localDateTimeToISO } from '../lib/dates'

export default function TaskDetailsModal({
  task,
  timezone,
  onClose,
  onStatusChange,
  onDelete,
  onUpdate,
}) {
  const closeButton = useRef(null)
  const previousFocus = useRef(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editVersion, setEditVersion] = useState(task.updated_at)
  const taskForm = {
    name: task.name,
    subject: task.subject,
    description: task.description ?? '',
    dueAt: formatDateTimeInput(task.due_at, timezone),
  }
  const [formState, setFormState] = useState(() => ({
    taskVersion: task.updated_at,
    values: taskForm,
  }))
  const form =
    formState.taskVersion === task.updated_at ? formState.values : taskForm

  function changeField(field, value) {
    setFormState({
      taskVersion: task.updated_at,
      values: { ...form, [field]: value },
    })
  }

  function startEditing() {
    setEditVersion(task.updated_at)
    setFormState({ taskVersion: task.updated_at, values: taskForm })
    setEditing(true)
  }

  useEffect(() => {
    previousFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    const appRoot = document.getElementById('root')
    const wasInert = appRoot?.inert
    document.body.style.overflow = 'hidden'
    if (appRoot) appRoot.inert = true
    closeButton.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const focusable = Array.from(
          document.querySelectorAll(
            '[data-task-dialog] button:not([disabled]), [data-task-dialog] input:not([disabled]), [data-task-dialog] textarea:not([disabled])'
          )
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      if (appRoot) appRoot.inert = wasInert
      document.removeEventListener('keydown', onKeyDown)
      previousFocus.current?.focus?.()
    }
  }, [onClose])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onUpdate(
        task.id,
        {
          name: form.name.trim(),
          subject: form.subject.trim(),
          description: form.description.trim() || null,
          due_at: localDateTimeToISO(form.dueAt, timezone),
        },
        editVersion
      )
      setEditing(false)
    } catch (saveError) {
      setError(saveError.message || 'Could not update this task.')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        data-task-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              {task.status}
            </p>
            <h2 id="task-details-title" className="text-2xl font-extrabold">
              {editing ? 'Edit quest' : task.name}
            </h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-semibold">
              Task name
              <input
                className={`${fieldClass} mt-1`}
                value={form.name}
                maxLength={150}
                required
                onChange={(event) => changeField('name', event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Subject
              <input
                className={`${fieldClass} mt-1`}
                value={form.subject}
                maxLength={100}
                required
                onChange={(event) => changeField('subject', event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Description
              <textarea
                className={`${fieldClass} mt-1`}
                value={form.description}
                maxLength={1000}
                rows={4}
                onChange={(event) => changeField('description', event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Due date and time
              <input
                className={`${fieldClass} mt-1`}
                type="datetime-local"
                value={form.dueAt}
                required
                onChange={(event) => changeField('dueAt', event.target.value)}
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Subject</dt>
                <dd className="mt-1 font-semibold">{task.subject}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Due</dt>
                <dd className="mt-1 font-semibold">{formatZonedDateTime(task.due_at, timezone)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                <dd className="mt-1">{formatZonedDateTime(task.created_at, timezone)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Last updated</dt>
                <dd className="mt-1">{formatZonedDateTime(task.updated_at, timezone)}</dd>
              </div>
              {task.completed_at && (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Completed</dt>
                  <dd className="mt-1">{formatZonedDateTime(task.completed_at, timezone)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p className="mb-1 font-semibold">Description</p>
              <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                {task.description || 'No description provided.'}
              </p>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {task.status === 'active' ? (
                <>
                  <button type="button" onClick={startEditing} className="rounded-xl border px-4 py-2 text-sm font-semibold">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSaving(true)
                      setError('')
                      try {
                        await onStatusChange(task.id, 'missed', task.updated_at)
                        onClose()
                      } catch (actionError) {
                        setError(actionError.message)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                  >
                    Mark missed
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSaving(true)
                      setError('')
                      try {
                        await onStatusChange(task.id, 'completed', task.updated_at)
                        onClose()
                      } catch (actionError) {
                        setError(actionError.message)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Mark done
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Permanently delete "${task.name}"? This cannot be undone.`)) return
                    setSaving(true)
                    setError('')
                    try {
                      await onDelete(task.id, task.updated_at)
                      onClose()
                    } catch (actionError) {
                      setError(actionError.message)
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  Permanently delete
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body
  )
}
