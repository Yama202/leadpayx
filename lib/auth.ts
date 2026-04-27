import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";

import { roleHome } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

function hasSupabaseAuthCookie(cookieList: { name: string }[]) {
  return cookieList.some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export const getCurrentAuthState = cache(async () => {
  const cookieStore = await cookies();

  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return { profile: null, userId: null };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub ?? null;

  if (claimsError || !userId) {
    return { profile: null, userId: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error || !data || data.status !== "active") {
    return { profile: null, userId };
  }

  return { profile: data, userId };
});

export async function getCurrentProfile() {
  const { profile } = await getCurrentAuthState();

  return profile;
}

export async function getAuthenticatedUserId() {
  const { userId } = await getCurrentAuthState();

  return userId;
}

export async function requireProfile() {
  const { profile, userId } = await getCurrentAuthState();

  if (!profile) {
    redirect(userId ? "/complete-profile" : "/login");
  }

  return profile;
}

export async function requireRole(roles: UserRole[]) {
  const profile = await requireProfile();

  if (!roles.includes(profile.role)) {
    redirect("/access-denied");
  }

  return profile;
}

export async function redirectAuthenticatedUser() {
  const { profile, userId } = await getCurrentAuthState();

  if (profile) {
    redirect(roleHome[profile.role]);
  }

  if (userId) {
    redirect("/complete-profile");
  }
}
