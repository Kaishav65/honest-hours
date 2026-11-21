"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; field?: "email" | "password" | "name" } | undefined;

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match. Try again." };
  redirect("/today");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const name = str(formData, "name");
  const timezone = str(formData, "timezone");

  if (!email) return { error: "Enter your email.", field: "email" };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", field: "password" };
  if (name.length < 1) return { error: "Tell us what to call you.", field: "name" };
  if (name.length > 20) return { error: "Keep your name to 20 characters or fewer.", field: "name" };

  const supabase = await createClient();
  const { data: open } = await supabase.rpc("signups_open");
  if (open === false) return { error: "Honest Hours is full right now. Please try again later." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name, timezone } },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists")
      return { error: "That email already has an account. Try logging in.", field: "email" };
    if (error.code === "weak_password")
      return { error: "That password is too weak. Use a longer one.", field: "password" };
    if (error.code === "validation_failed" || error.code === "email_address_invalid")
      return { error: "That email doesn't look right.", field: "email" };
    return { error: "Couldn't create your account. Please try again." };
  }
  redirect("/today");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
