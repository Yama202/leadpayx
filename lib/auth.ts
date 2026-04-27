import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims.sub) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.claims.sub)
    .single<Profile>();

  if (error || !data || data.status !== "active") {
    return null;
  }

  return data;
}

export async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();

  if (error || !claims?.claims.sub) {
    return null;
  }

  return claims.claims.sub;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    const userId = await getAuthenticatedUserId();
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
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(roleHome[profile.role]);
  }

  const userId = await getAuthenticatedUserId();

  if (userId) {
    redirect("/complete-profile");
  }
}
