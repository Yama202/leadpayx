/* Minimal Web Push receiver — atualizar em deploy se mudar payloads. */

self.addEventListener("push", (event) => {
  /** @type {{ title?: string; body?: string; data?: { url?: string } }} */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    const t = event.data?.text() ?? "";
    payload = {
      title: "LeadPayX",
      body: t.slice(0, 180),
    };
  }

  const title = payload.title || "LeadPayX";
  const options = {
    body: payload.body || "Nova atualização.",
    icon: "/icon.png",
    badge: "/icon.png",
    data: payload.data || {},
    tag:
      typeof payload?.data?.accountId === "string"
        ? `account-reminder-${payload.data.accountId}`
        : undefined,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * @param {string | undefined} raw
 * @returns {string}
 */
function resolveNotificationTargetUrl(raw) {
  const fallback = self.location.origin + "/captador/dashboard";
  if (typeof raw !== "string" || !raw.trim()) {
    return fallback;
  }
  const t = raw.trim();
  try {
    if (t.startsWith("/")) {
      return self.location.origin + t;
    }
    const u = new URL(t);
    if (u.origin === self.location.origin) {
      return u.href;
    }
  } catch {
    /* noop */
  }
  return fallback;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = resolveNotificationTargetUrl(event.notification?.data?.url);

  event.waitUntil(self.clients.openWindow(url));
});
