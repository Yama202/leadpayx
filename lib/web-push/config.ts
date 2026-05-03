export type WebPushVapidConfig = {
  publicKey: string;
  privateKey: string;
  contact: string;
};

export function parseWebPushVapidConfig(opts: {
  publicKey?: string | null;
  privateKey?: string | null;
  contact?: string | null;
}): WebPushVapidConfig | null {
  const publicKey = opts.publicKey?.trim();
  const privateKey = opts.privateKey?.trim();
  let contact =
    opts.contact?.trim() || process.env.WEB_PUSH_VAPID_CONTACT?.trim() || "mailto:notifications@leadpayx.com.br";
  if (contact.length > 0 && !contact.startsWith("mailto:") && contact.includes("@")) {
    contact = `mailto:${contact}`;
  }

  if (!publicKey || !privateKey || !contact.startsWith("mailto:")) {
    return null;
  }

  return { publicKey, privateKey, contact };
}

export function webPushConfiguredFromEnv(): WebPushVapidConfig | null {
  return parseWebPushVapidConfig({
    publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
    contact: process.env.WEB_PUSH_VAPID_CONTACT,
  });
}
