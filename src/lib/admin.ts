import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminGuard = {
  userId: string;
  email: string;
};

export async function requireAdmin(): Promise<AdminGuard | null> {
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

  if (!profile || profile.is_disabled || profile.role !== "admin") {
    return null;
  }

  return { userId: data.user.id, email: data.user.email ?? "" };
}
