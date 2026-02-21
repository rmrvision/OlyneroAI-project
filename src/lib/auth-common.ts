import type { User } from "@supabase/supabase-js";
import { parseRole, type Role } from "@/lib/role";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: Role;
}

export function toSessionUser(user: User, role?: Role): SessionUser {
  const metadata = user.user_metadata ?? {};
  const name =
    typeof metadata.name === "string" && metadata.name.trim() !== ""
      ? metadata.name
      : (user.email ?? "User");

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    image: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    role: role ?? parseRole(String(metadata.role ?? "user")),
  };
}

export function requireLegacyNumericUserId(user: SessionUser) {
  const parsed = Number.parseInt(user.id, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      "Legacy numeric user ID required for the old database layer. Supabase UUIDs are not supported here.",
    );
  }
  return parsed;
}
