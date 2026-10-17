function parsePayload(event) {
  try {
    return event.data ? event.data.json() : {}
  } catch {
    return { body: event.data?.text() ?? '' }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SyllaBuddy reminder', {
      body: payload.body || 'You have an upcoming task deadline.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: payload.url || '/' },
      tag: payload.tag,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matching = clients.find((client) => client.url.startsWith(self.location.origin))
      if (matching) {
        matching.navigate(target)
        return matching.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
