import { supabase } from './supabase'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function listNotifications(userId) {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id, task_id, title, message, scheduled_at, sent_at, read_at, status, delivery_error')
    .eq('user_id', userId)
    .in('status', ['sent', 'failed'])
    .order('scheduled_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function countUnreadNotifications(userId) {
  const { count, error } = await requireSupabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id) {
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function subscribeForPush(userId, updateProfile) {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.')
  }
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('Push notifications are not configured for this app yet.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Browser notifications are blocked. Change this site’s permission in browser settings to enable them.'
      : 'Notification permission was not granted.')
  }

  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(vapidKey),
    }))
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('The browser returned an incomplete push subscription.')
  }

  const { error } = await requireSupabase().from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  await updateProfile({ push_enabled: true })
}

export async function unsubscribeFromPush(userId, updateProfile) {
  const { error: deleteError } = await requireSupabase()
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
  if (deleteError) throw deleteError

  let unsubscribeError
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const removed = await subscription.unsubscribe()
        if (!removed) unsubscribeError = new Error('The browser could not remove this push subscription.')
      }
    } catch (error) {
      unsubscribeError = error
    }
  }
  await updateProfile({ push_enabled: false })
  if (unsubscribeError) throw unsubscribeError
}

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}
