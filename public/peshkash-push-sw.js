self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Peshkash Updates', {
    body: payload.body || 'There is something new waiting for you.',
    icon: payload.icon || '/android-chrome-192x192.png',
    badge: payload.badge || '/favicon-32x32.png',
    tag: payload.tag || 'peshkash-update',
    renotify: false,
    data: { url: payload.url || '/home/history' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/home/history', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const exact = clients.find(client => client.url === target);
    if (exact) return exact.focus();
    const existing = clients.find(client => client.url.startsWith(self.location.origin));
    if (existing) return existing.navigate(target).then(client => client && client.focus());
    return self.clients.openWindow(target);
  }));
});
