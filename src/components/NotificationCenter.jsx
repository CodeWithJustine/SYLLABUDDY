import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  listNotifications,
  markNotificationRead,
  countUnreadNotifications,
  subscribeForPush,
  unsubscribeFromPush,
} from '../lib/notifications'
import { supabase } from '../lib/supabase'

export default function NotificationCenter({ userId, profile, updateProfile, onError }) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const [timezoneDraft, setTimezoneDraft] = useState({
    savedTimezone: profile?.timezone ?? '',
    value: profile?.timezone ?? '',
  })
  const timezone =
    timezoneDraft.savedTimezone === (profile?.timezone ?? '')
      ? timezoneDraft.value
      : profile?.timezone ?? ''

  const fetchNotifications = useCallback(async () => {
    const [nextItems, count] = await Promise.all([
      listNotifications(userId),
      countUnreadNotifications(userId),
    ])
    return { nextItems, count }
  }, [userId])

  useEffect(() => {
    let mounted = true
    fetchNotifications()
      .then(({ nextItems, count }) => {
        if (!mounted) return
        setItems(nextItems)
        setUnreadCount(count)
      })
      .catch((error) => {
        if (mounted) onError(error.message)
      })
    return () => {
      mounted = false
    }
  }, [fetchNotifications, onError])

  useEffect(() => {
    const channel = supabase
      ?.channel(`notification-center:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
          .then(({ nextItems, count }) => {
            setItems(nextItems)
            setUnreadCount(count)
          })
          .catch((error) => onError(error.message))
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onError(error?.message ?? `Notification sync ${status.toLowerCase()}.`)
        }
      })
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, onError, fetchNotifications])

  async function togglePreference(field, checked) {
    setBusy(true)
    setLocalError('')
    try {
      await updateProfile({ [field]: checked })
    } catch (error) {
      setLocalError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePush(checked) {
    setBusy(true)
    setLocalError('')
    try {
      if (checked) await subscribeForPush(userId, updateProfile)
      else await unsubscribeFromPush(userId, updateProfile)
    } catch (error) {
      setLocalError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveTimezone(event) {
    event.preventDefault()
    setBusy(true)
    setLocalError('')
    try {
      await updateProfile({ timezone: timezone.trim() })
    } catch (error) {
      setLocalError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function setRead(item) {
    if (item.read_at) return
    try {
      await markNotificationRead(item.id)
      setItems((current) =>
        current.map((notice) =>
          notice.id === item.id
            ? { ...notice, read_at: new Date().toISOString() }
            : notice
        )
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (error) {
      setLocalError(error.message)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notification center"
          className="fixed inset-x-4 top-16 z-40 max-h-[75vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Notifications</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:underline">
              Close
            </button>
          </div>

          <div className="mb-4 space-y-3 border-b border-slate-200 pb-4 dark:border-slate-700">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>In-app reminders</span>
              <input
                type="checkbox"
                checked={Boolean(profile?.notifications_enabled)}
                disabled={busy}
                onChange={(event) => togglePreference('notifications_enabled', event.target.checked)}
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These appear in this notification center when the app checks in.
            </p>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Browser/device push</span>
              <input
                type="checkbox"
                checked={Boolean(profile?.push_enabled)}
                disabled={busy}
                onChange={(event) => togglePush(event.target.checked)}
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enabling asks this browser for notification permission. Each device must opt in separately.
            </p>
            <form onSubmit={saveTimezone} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-xs font-semibold">
                Reminder timezone (IANA)
                <input
                  type="text"
                  required
                  value={timezone}
                  onChange={(event) => setTimezoneDraft({
                    savedTimezone: profile?.timezone ?? '',
                    value: event.target.value,
                  })}
                  placeholder="e.g. Asia/Manila"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <button
                type="submit"
                disabled={busy || timezone === profile?.timezone}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
              >
                Save
              </button>
            </form>
          </div>

          {localError && <p role="alert" className="mb-3 text-sm text-red-600">{localError}</p>}
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No reminders yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className={`rounded-xl p-3 ${item.read_at ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-blue-50 dark:bg-blue-950/40'}`}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                  {item.delivery_error && (
                    <p role="alert" className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {item.delivery_error}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(item.scheduled_at).toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {!item.read_at && (
                      <button type="button" onClick={() => setRead(item)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <Check size={14} /> Mark read
                      </button>
                    )}
                    {item.task_id && (
                      <Link
                        to={`/?task=${encodeURIComponent(item.task_id)}`}
                        onClick={() => setOpen(false)}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
                      >
                        Open task <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
