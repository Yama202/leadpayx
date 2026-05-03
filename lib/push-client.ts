/**
 * Converte VAPID pública (URL-safe Base64) para formato `applicationServerKey` do Push API.
 */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padded = `${base64Url}`.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function pushClientsideSupported(win: Window & typeof globalThis): {
  secure: boolean;
  sw: boolean;
  permission: boolean;
  pushManager: boolean;
} {
  return {
    secure: win.isSecureContext,
    sw: "serviceWorker" in win.navigator,
    permission: "Notification" in win,
    pushManager: "PushManager" in win,
  };
}
