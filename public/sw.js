/* eslint-disable no-restricted-globals */

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch (error) {
    console.error("Failed to parse Web Push payload:", error);

    payload = {
      title: "SmartPack Notification",
      body: event.data.text(),
    };
  }

  const title = payload.title || "SmartPack Notification";

  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: payload.url || "/",
      ...(payload.data || {}),
    },
    tag: payload.tag || undefined,
    renotify: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );

  // Only allow navigation within the SmartPack frontend origin.
  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
