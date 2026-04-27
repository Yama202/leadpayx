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

function getSignupErrorMessage(error: { message?: string; status?: number }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("already registered") || message.includes("already exists")) {
    return "Este e-mail já tem cadastro. Tente entrar ou recuperar o acesso.";
  }

  if (message.includes("password")) {
    return "A senha não atende aos critérios mínimos. Use uma senha exclusiva para o LeadPayX.";
  }

  if (
    error.status === 500 ||
    message.includes("database") ||
    message.includes("saving new user")
  ) {
    return "Erro interno ao salvar o cadastro no banco. Código SIGNUP_DB_PROFILE.";
  }

  return "Não foi possível criar o acesso. Revise os dados e tente novamente.";
}

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
    console.error("[SIGNUP_ERROR]", {
      status: error.status,
      name: error.name,
      message: error.message,
    });

    return { ok: false, message: getSignupErrorMessage(error) };
  }

  if (data.session) {
    redirect("/complete-profile");
  }

  redirect("/login?created=1");
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
