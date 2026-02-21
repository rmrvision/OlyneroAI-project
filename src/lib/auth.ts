import { cache } from "react";
import { toSessionUser } from "@/lib/auth-common";
import { parseRole } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function $getSession() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session ?? null;
}

export const getSession = cache($getSession);

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_disabled")
    .eq("id", data.user.id)
    .single();

  if (profile?.is_disabled) {
    return null;
  }

  const rawRole = profile?.role ?? data.user.user_metadata?.role;
  return toSessionUser(data.user, parseRole(String(rawRole ?? "user")));
}
