import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(getPublicSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
