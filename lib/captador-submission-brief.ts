import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { CaptadorSubmissionBrief } from "./types";

export async function getCaptadorSubmissionBrief(
  captadorId: string,
): Promise<CaptadorSubmissionBrief | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("captador_submission_briefs")
      .select("captador_id, min_deposit_brl, updated_at, updated_by")
      .eq("captador_id", captadorId)
      .maybeSingle<CaptadorSubmissionBrief>();
    if (!error) {
      return data ?? null;
    }
    console.error("[getCaptadorSubmissionBrief] admin read failed", {
      captadorId,
      code: error.code,
      message: error.message,
    });
  } catch {
    // fallback abaixo usa o client autenticado (RLS pode negar e retornar null).
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("captador_submission_briefs")
    .select("captador_id, min_deposit_brl, updated_at, updated_by")
    .eq("captador_id", captadorId)
    .maybeSingle<CaptadorSubmissionBrief>();
  if (error) {
    console.error("[getCaptadorSubmissionBrief] user read failed", {
      captadorId,
      code: error.code,
      message: error.message,
    });
  }
  return data ?? null;
}

export async function getActiveOffersMinDepositBrl(): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("promotion_offers")
      .select("min_deposit_brl")
      .eq("status", "active")
      .or("valid_until.is.null,valid_until.gt.now()");

    if (!error) {
      const mins = (data ?? [])
        .map((row) => Number((row as { min_deposit_brl: unknown }).min_deposit_brl))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (!mins.length) return null;
      return Math.max(...mins);
    }
  } catch {
    // fallback abaixo usa client autenticado.
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_offers")
    .select("min_deposit_brl")
    .eq("status", "active")
    .or("valid_until.is.null,valid_until.gt.now()");

  if (error) {
    return null;
  }

  const mins = (data ?? [])
    .map((row) => Number((row as { min_deposit_brl: unknown }).min_deposit_brl))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!mins.length) return null;
  return Math.max(...mins);
}

export async function getActiveOffersRewardPerAccountBrl(): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("promotion_offers")
      .select("reward_amount")
      .eq("status", "active")
      .or("valid_until.is.null,valid_until.gt.now()");

    if (!error) {
      const values = (data ?? [])
        .map((row) => Number((row as { reward_amount: unknown }).reward_amount))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (!values.length) return null;
      return Math.max(...values);
    }
  } catch {
    // fallback abaixo usa client autenticado.
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_offers")
    .select("reward_amount")
    .eq("status", "active")
    .or("valid_until.is.null,valid_until.gt.now()");

  if (error) {
    return null;
  }

  const values = (data ?? [])
    .map((row) => Number((row as { reward_amount: unknown }).reward_amount))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  return Math.max(...values);
}

export type ActiveOffersDepositRange = {
  minDepositBrl: number | null;
  maxDepositBrl: number | null;
};

export async function getActiveOffersDepositRange(): Promise<ActiveOffersDepositRange> {
  const normalize = (rows: Array<{ min_deposit_brl: unknown; max_deposit_brl: unknown }>) => {
    const mins = rows
      .map((row) => Number(row.min_deposit_brl))
      .filter((value) => Number.isFinite(value) && value > 0);
    const maxs = rows
      .map((row) => Number(row.max_deposit_brl))
      .filter((value) => Number.isFinite(value) && value > 0);

    const minDepositBrl = mins.length ? Math.max(...mins) : null;
    const maxDepositBrlRaw = maxs.length ? Math.min(...maxs) : null;
    const maxDepositBrl =
      minDepositBrl != null && maxDepositBrlRaw != null && maxDepositBrlRaw < minDepositBrl
        ? minDepositBrl
        : maxDepositBrlRaw;

    return { minDepositBrl, maxDepositBrl };
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("promotion_offers")
      .select("min_deposit_brl,max_deposit_brl")
      .eq("status", "active")
      .or("valid_until.is.null,valid_until.gt.now()");

    if (!error) {
      return normalize(
        ((data ?? []) as Array<{ min_deposit_brl: unknown; max_deposit_brl: unknown }>),
      );
    }
  } catch {
    // fallback abaixo usa client autenticado.
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_offers")
    .select("min_deposit_brl,max_deposit_brl")
    .eq("status", "active")
    .or("valid_until.is.null,valid_until.gt.now()");

  if (error) {
    return { minDepositBrl: null, maxDepositBrl: null };
  }

  return normalize((data ?? []) as Array<{ min_deposit_brl: unknown; max_deposit_brl: unknown }>);
}
