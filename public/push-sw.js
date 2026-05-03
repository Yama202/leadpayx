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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    typeof event.notification?.data?.url === "string" && event.notification.data.url.startsWith("/")
      ? `${self.location.origin}${event.notification.data.url}`
      : self.location.origin + "/captador/dashboard";

  event.waitUntil(self.clients.openWindow(url));
});
