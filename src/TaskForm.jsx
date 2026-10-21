import { useState } from 'react'
import { formatDateTimeInput } from './lib/dates'

const initialForm = {
  name: '',
  subject: '',
  description: '',
  dueDate: '',
}

export default function TaskForm({ onAddTask, saving = false, timezone }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.subject.trim() || !form.dueDate) {
      setError('Please complete the task name, subject, and due date.')
      return
    }

    Promise.resolve()
      .then(() => onAddTask(form))
      .then(() => {
        setForm(initialForm)
        setError('')
      })
      .catch((submitError) => {
        setError(submitError.message || 'Could not save this task.')
      })
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800'
  const labelClass =
    'mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="name" className={labelClass}>Task Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Calculus Assignment"
            maxLength={150}
            required
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="subject" className={labelClass}>Course / Subject</label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={form.subject}
            onChange={handleChange}
            placeholder="e.g. Differential Equations"
            maxLength={100}
            required
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="dueDate" className={labelClass}>Due date and time</label>
          <input
            id="dueDate"
            name="dueDate"
            type="datetime-local"
            value={form.dueDate}
            min={formatDateTimeInput(new Date(), timezone)}
            onChange={handleChange}
            required
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          maxLength={1000}
          rows={3}
          placeholder="Add useful task details"
          className={`${fieldClass} resize-y`}
        />
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          New tasks will appear in Active Quests.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          {saving ? 'Saving...' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
