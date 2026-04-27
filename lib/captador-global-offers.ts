/**
 * Monta URL final para oferta global do captador com UTM LeadPayX.
 * Preserva parâmetros de query que não são utm_*; define utm_source, utm_medium,
 * utm_campaign e utm_content de forma consistente para analytics.
 */
export function slugifyCaptadorOfferName(name: string): string {
  const ascii = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = ascii.slice(0, 80);
  return slug.length >= 2 ? slug : "oferta";
}

export function buildCaptadorGlobalOfferUrl(
  urlBase: string,
  offerNameForSlug: string,
  utmContent: string,
): string {
  const trimmed = urlBase.trim();
  const u = new URL(trimmed);
  const preserved = new URLSearchParams();
  for (const [key, value] of u.searchParams.entries()) {
    if (!key.toLowerCase().startsWith("utm_")) {
      preserved.set(key, value);
    }
  }
  const merged = new URLSearchParams(preserved);
  merged.set("utm_source", "leadpayx");
  merged.set("utm_medium", "captador");
  merged.set("utm_campaign", slugifyCaptadorOfferName(offerNameForSlug));
  merged.set("utm_content", utmContent);
  u.search = merged.toString();
  return u.toString();
}
