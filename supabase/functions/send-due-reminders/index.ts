import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type ClaimedReminder = {
  id: string
  user_id: string
  task_id: string | null
  reminder_stage: number
  title: string
  message: string
}

const jsonHeaders = { 'Content-Type': 'application/json' }

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cronSecret = Deno.env.get('REMINDER_CRON_SECRET')
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Server configuration is incomplete.' }, { status: 500 })
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject)
  if (pushConfigured) {
    webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!)
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: reminders, error: claimError } = await client.rpc(
    'claim_due_notifications',
    { batch_limit: 100 }
  )
  if (claimError) {
    console.error('Unable to claim due reminders', claimError)
    return Response.json({ error: 'Unable to claim due reminders.' }, { status: 500 })
  }

  let delivered = 0
  let skipped = 0
  for (const reminder of (reminders ?? []) as ClaimedReminder[]) {
    try {
      const { data: currentReminder, error: reminderError } = await client
        .from('notifications')
        .select('status')
        .eq('id', reminder.id)
        .maybeSingle()
      if (reminderError) throw reminderError
      if (currentReminder?.status !== 'processing') {
        skipped += 1
        continue
      }

      const [{ data: task, error: taskError }, { data: profile, error: profileError }] =
        await Promise.all([
          reminder.task_id
            ? client.from('tasks').select('id, name, subject, due_at, status').eq('id', reminder.task_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          client.from('profiles').select('notifications_enabled, push_enabled, timezone').eq('id', reminder.user_id).single(),
        ])
      if (taskError) throw taskError
      if (profileError) throw profileError
      if (!task || task.status !== 'active' || new Date(task.due_at) <= new Date()) {
        const { error } = await client
          .from('notifications')
          .update({ status: 'cancelled', processing_at: null })
          .eq('id', reminder.id)
          .eq('status', 'processing')
        if (error) throw error
        skipped += 1
        continue
      }

      const dueTime = new Date(task.due_at).toLocaleString('en-US', {
        timeZone: profile.timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      const message = `${task.name} for ${task.subject} is due in ${reminder.reminder_stage} day(s), on ${dueTime}.`
      let pushDelivered = false
      let deliveryError: string | null = null
      if (profile.push_enabled && pushConfigured) {
        const { data: subscriptions, error: subscriptionError } = await client
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', reminder.user_id)
        if (subscriptionError) throw subscriptionError
        if (subscriptions.length === 0) {
          deliveryError = 'No active device subscription was found for push delivery.'
        }

        for (const subscription of subscriptions ?? []) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              JSON.stringify({
                title: reminder.title,
                body: message,
                url: reminder.task_id
                  ? `/?task=${encodeURIComponent(reminder.task_id)}`
                  : '/',
                tag: reminder.id,
              })
            )
            pushDelivered = true
          } catch (pushError) {
            const statusCode = Number((pushError as { statusCode?: number }).statusCode)
            if (statusCode === 404 || statusCode === 410) {
              const { error } = await client
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id)
              if (error) console.error('Could not remove expired push subscription', error)
            } else {
              console.error('Push delivery failed', pushError)
              deliveryError = 'Push delivery failed. The in-app reminder is available here.'
            }
          }
        }
      } else if (profile.push_enabled) {
        deliveryError = 'Push delivery is not configured by the application operator.'
      }

      const inAppDelivered = profile.notifications_enabled
      const finalStatus =
        inAppDelivered || pushDelivered
          ? 'sent'
          : profile.push_enabled && pushConfigured
            ? 'failed'
            : 'cancelled'
      const { error: updateError } = await client
        .from('notifications')
        .update({
          status: finalStatus,
          processing_at: null,
          message,
          delivery_error: deliveryError,
          sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', reminder.id)
        .eq('status', 'processing')
      if (updateError) throw updateError
      if (finalStatus === 'sent') delivered += 1
      else skipped += 1
    } catch (error) {
      console.error(`Unable to deliver reminder ${reminder.id}`, error)
      const { error: updateError } = await client
        .from('notifications')
        .update({
          status: 'failed',
          processing_at: null,
          delivery_error: 'Reminder delivery failed. Please check notification settings or contact the application operator.',
        })
        .eq('id', reminder.id)
        .eq('status', 'processing')
      if (updateError) console.error('Unable to mark reminder failed', updateError)
    }
  }

  return new Response(
    JSON.stringify({ delivered, skipped }),
    { status: 200, headers: jsonHeaders }
  )
})
