import { supabase } from './supabase'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function listTasks() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .order('due_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createTask(userId, task) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('tasks')
    .insert({
      user_id: userId,
      name: task.name.trim(),
      subject: task.subject.trim(),
      description: task.description?.trim() || null,
      due_at: task.dueAt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(taskId, changes, expectedUpdatedAt) {
  const client = requireSupabase()
  let query = client
    .from('tasks')
    .update(changes)
    .eq('id', taskId)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  const { data, error } = await query.select().maybeSingle()

  if (error) throw error
  if (!data && expectedUpdatedAt) {
    throw new Error('This task changed on another device. Close and reopen it before saving.')
  }
  if (!data) throw new Error('The task no longer exists.')
  return data
}

export async function removeTask(taskId, expectedUpdatedAt) {
  const client = requireSupabase()
  let query = client.from('tasks').delete().eq('id', taskId)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  if (!data && expectedUpdatedAt) {
    throw new Error('This task changed on another device. Close and reopen it before deleting.')
  }
  if (!data) throw new Error('The task no longer exists.')
}

export function subscribeToTasks(userId, onChange, onError) {
  const client = requireSupabase()
  const channel = client
    .channel(`tasks:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(error ?? new Error(`Task sync ${status.toLowerCase()}.`))
      }
    })

  return () => {
    client.removeChannel(channel)
  }
}

export async function importLegacyTasks(userId, username) {
  const client = requireSupabase()
  const key = `syllabuddy_tasks_${username}`
  const marker = `syllabuddy_imported_${userId}_${username}`
  if (localStorage.getItem(marker)) {
    throw new Error('Task history from this local account was already imported.')
  }
  const raw = localStorage.getItem(key)
  if (!raw) throw new Error('No saved task history was found for that username.')

  let legacyTasks
  try {
    legacyTasks = JSON.parse(raw)
  } catch {
    throw new Error('The saved task history is not valid JSON.')
  }

  if (!Array.isArray(legacyTasks)) {
    throw new Error('The saved task history has an unexpected format.')
  }

  const rows = legacyTasks.map((task) => {
    if (!task.name || !task.subject) {
      throw new Error('A saved task is missing its name or subject.')
    }
    const dueAt = task.dueDate
      ? new Date(`${task.dueDate}T00:00:00`).toISOString()
      : new Date().toISOString()

    return {
      user_id: userId,
      name: String(task.name).slice(0, 150),
      subject: String(task.subject).slice(0, 100),
      due_at: dueAt,
      status: ['active', 'completed', 'missed'].includes(task.status)
        ? task.status
        : 'active',
      created_at: task.createdAt || new Date().toISOString(),
    }
  })

  if (rows.length === 0) {
    localStorage.setItem(marker, new Date().toISOString())
    return 0
  }

  const { error } = await client.from('tasks').insert(rows)
  if (error) throw error
  localStorage.setItem(marker, new Date().toISOString())
  return rows.length
}
