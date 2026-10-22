 

/**
 * @file public/sw.js
 * @description Service worker for handling SmartPack Web Push notifications.
 *
 * Receives push messages from the browser's Push Service, displays system
 * notifications, and handles notification clicks by navigating to the
 * appropriate page within the SmartPack frontend.
 */

/**
 * Handle incoming push notifications.
 *
 * Parses the push payload as JSON, falling back to plain text if parsing
 * fails. Displays a system notification using the provided title, body,
 * icon, badge, URL, and additional data.
 *
 * @param {PushEvent} event - The incoming push event.
 * @returns {void}
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  /** @type {{ title?: string, body?: string, url?: string, data?: Record<string, unknown>, tag?: string } | null} */
  let payload

  try {
    payload = event.data.json()
  } catch (error) {
    console.error('Failed to parse Web Push payload:', error)

    payload = {
      title: 'SmartPack Notification',
      body: event.data.text(),
    }
  }

  const title = payload.title || 'SmartPack Notification'

  const options = {
    body: payload.body || 'You have a new notification.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      url: payload.url || '/',
      ...payload.data,
    },
    tag: payload.tag || undefined,
    renotify: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Handle notification clicks.
 *
 * Closes the clicked notification, validates that the destination belongs
 * to the SmartPack frontend origin, and navigates an existing frontend
 * window to the destination when possible. Opens a new window if no
 * suitable existing window is available.
 *
 * @param {NotificationEvent} event - The notification click event.
 * @returns {void}
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin)

  // Only allow navigation within the SmartPack frontend origin.
  if (targetUrl.origin !== self.location.origin) {
    return
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl.href)
            return client.focus()
          }
        }

        return self.clients.openWindow(targetUrl.href)
      })
  )
})
