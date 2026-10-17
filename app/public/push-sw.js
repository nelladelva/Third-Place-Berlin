/* Imported by the generated service worker: shows pushes and opens the right screen when tapped. */
self.addEventListener('push', (event) => {
  let data = { title: 'Third Place Berlin', body: '', url: '#/' };
  try { data = { ...data, ...event.data.json() }; } catch (e) { /* plain text push */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: data.url },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(self.registration.scope).href + (event.notification.data?.url || '#/');
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.navigate(target); return c.focus(); } }
    return clients.openWindow(target);
  })());
});
