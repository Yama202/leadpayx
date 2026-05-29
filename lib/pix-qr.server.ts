const BATCH = 8;

export async function buildPixQrCodeMap(
  entries: Array<{ id: string; pix_key: string | null }>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const QRCode = (await import("qrcode")).default;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (entry) => {
        const pix = entry.pix_key?.trim();
        if (!pix) return;
        try {
          const dataUrl = await QRCode.toDataURL(pix, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 220,
          });
          map.set(entry.id, dataUrl);
        } catch {
          // silent — QR failure is non-fatal
        }
      }),
    );
  }
  return map;
}
