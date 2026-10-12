const USERS_KEY = 'syllabuddy_users'
const SESSION_KEY = 'syllabuddy_session'

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function getUsers() {
  const users = readJSON(USERS_KEY, {})
  return users && typeof users === 'object' && !Array.isArray(users)
    ? users
    : {}
}

export function getSession() {
  const session = readJSON(SESSION_KEY, null)

  if (
    session &&
    typeof session.username === 'string' &&
    getUsers()[session.username.toLowerCase()]
  ) {
    return session
  }

  localStorage.removeItem(SESSION_KEY)
  return null
}

export async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure hashing is unavailable in this browser context.')
  }

  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function registerUser(username, password) {
  const normalized = username.trim().toLowerCase()
  const users = getUsers()

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
    throw new Error(
      'Username must be 3–20 characters using letters, numbers, or underscores.'
    )
  }

  if (users[normalized]) {
    throw new Error('That username is already registered. Please sign in.')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const passwordHash = await hashPassword(password)

  users[normalized] = {
    username: username.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(users))

  const session = { username: normalized }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))

  return session
}

export async function loginUser(username, password) {
  const normalized = username.trim().toLowerCase()
  const user = getUsers()[normalized]

  if (!user) {
    throw new Error('Account not found. Please register first.')
  }

  const passwordHash = await hashPassword(password)

  if (passwordHash !== user.passwordHash) {
    throw new Error('Incorrect username or password.')
  }

  const session = { username: normalized }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))

  return session
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY)
}

export function getTasks(username) {
  const tasks = readJSON(`syllabuddy_tasks_${username}`, [])
  return Array.isArray(tasks) ? tasks : []
}

export function saveTasks(username, tasks) {
  localStorage.setItem(
    `syllabuddy_tasks_${username}`,
    JSON.stringify(tasks)
  )
}
