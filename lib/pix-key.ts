import { z } from "zod";

/**
 * Validação pragmática de chave Pix (não substitui confirmação bancária).
 */
export function isValidPixKey(value: string): boolean {
  const v = value.trim();
  if (v.length < 3 || v.length > 160) {
    return false;
  }
  if (z.string().email().safeParse(v).success) {
    return true;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return true;
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && /^[0-9]{11}$/.test(digits)) {
    return true;
  }
  if (digits.length === 14 && /^[0-9]{14}$/.test(digits)) {
    return true;
  }
  if (digits.length >= 10 && digits.length <= 13) {
    return true;
  }
  if (/^[a-z0-9._-]{3,}$/i.test(v) && v.length <= 77) {
    return true;
  }
  return false;
}

/** Mascaramento para exibição a admin (não oculta completamente para reconciliação operacional leve). */
export function maskPixKeyForAdmin(pix: string | null | undefined): string {
  if (!pix?.trim()) {
    return "—";
  }
  const t = pix.trim();
  if (t.length <= 6) {
    return "•••";
  }
  return `${t.slice(0, 3)}•••${t.slice(-2)}`;
}
