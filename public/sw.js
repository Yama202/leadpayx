/* LeadPayX Service Worker — offline fallback + web push */

const OFFLINE_URL = '/offline.html';
const CACHE = 'lpx-offline-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

/* Navigation: tenta rede, cai no offline.html se falhar */
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

/* ── Web Push ──────────────────────────────────────────────── */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    const t = event.data?.text() ?? '';
    payload = { title: 'LeadPayX', body: t.slice(0, 180) };
  }

  const title = payload.title || 'LeadPayX';
  const options = {
    body: payload.body || 'Nova atualização.',
    icon: '/icon.png',
    badge: '/icon.png',
    data: payload.data || {},
    tag: typeof payload?.data?.accountId === 'string'
      ? `account-reminder-${payload.data.accountId}`
      : (typeof payload?.data?.tag === 'string' ? payload.data.tag : undefined),
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = resolveNotificationTargetUrl(event.notification?.data?.url);
  event.waitUntil(self.clients.openWindow(url));
});

function resolveNotificationTargetUrl(raw) {
  const fallback = self.location.origin + '/captador/dashboard';
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const t = raw.trim();
  try {
    if (t.startsWith('/')) return self.location.origin + t;
    const u = new URL(t);
    if (u.origin === self.location.origin) return u.href;
  } catch { /* noop */ }
  return fallback;
}
