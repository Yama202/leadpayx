"use server";

import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  initialActionState,
  loginSchema,
  registerSchema,
  profileSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";
import type { Profile } from "@/lib/types";

export async function loginAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const parsed = loginSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados de acesso.", parsed.error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    return {
      ok: false,
      message: "Login confirmado, mas não foi possível carregar seu perfil.",
    };
  }

  if (!profile) {
    redirect("/complete-profile");
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return { ok: false, message: "Seu perfil está inativo. Fale com o admin." };
  }

  redirect(roleHome[profile.role]);
}

export async function registerAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const parsed = registerSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados do cadastro.", parsed.error);
  }

  const { email, password, name, registrationCode } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        registration_code: registrationCode || null,
      },
    },
  });

  if (error) {
    return { ok: false, message: "Não foi possível criar o acesso." };
  }

  if (data.session) {
    redirect("/complete-profile");
  }

  return {
    ok: true,
    message: "Cadastro criado. Confirme seu e-mail se o Supabase exigir confirmação.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function loginFormAction(formData: FormData): Promise<void> {
  await loginAction(formData);
}

export async function registerFormAction(formData: FormData): Promise<void> {
  await registerAction(formData);
}

export async function completeProfileAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const parsed = profileSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados do perfil.", parsed.error);
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims.sub) {
    return { ok: false, message: "Sessão expirada. Entre novamente." };
  }

  const email = typeof claims.claims.email === "string" ? claims.claims.email : null;
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.claims.sub)
    .maybeSingle();

  const { data: profile, error } = existingProfile
    ? await supabase
        .from("profiles")
        .update({
          name: parsed.data.name,
          instagram: parsed.data.instagram || null,
          whatsapp: parsed.data.whatsapp,
          pix_key: parsed.data.pixKey,
        })
        .eq("id", claims.claims.sub)
        .select("*")
        .single<Profile>()
    : await supabase
        .from("profiles")
        .insert({
          id: claims.claims.sub,
          name: parsed.data.name,
          email,
          instagram: parsed.data.instagram || null,
          whatsapp: parsed.data.whatsapp,
          pix_key: parsed.data.pixKey,
          role: "captador",
          status: "active",
          referral_code: crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase(),
        })
        .select("*")
        .single<Profile>();

  if (error || !profile) {
    return { ok: false, message: "Não foi possível completar seu perfil." };
  }

  redirect(roleHome[profile.role]);
}
