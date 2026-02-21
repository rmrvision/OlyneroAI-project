import type {
  AuthChangeEvent,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { toSessionUser } from "@/lib/auth-common";
import { parseRole } from "@/lib/role";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const Context = createContext<{
  session: SupabaseSession | null;
  user: ReturnType<typeof toSessionUser> | null;
} | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: SupabaseSession | null;
  children: ReactNode;
}) {
  const [currentSession, setCurrentSession] = useState<SupabaseSession | null>(
    session ?? null,
  );
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: SupabaseSession | null) => {
        setCurrentSession(newSession);
      },
    );
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!currentSession?.user) {
      setProfileRole(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("profiles")
      .select("role,is_disabled")
      .eq("id", currentSession.user.id)
      .single()
      .then((response: { data: { role?: string; is_disabled?: boolean } | null }) => {
        const data = response.data as { role?: string; is_disabled?: boolean } | null;
        if (!active) return;
        if (data?.is_disabled) {
          supabase.auth.signOut();
          setProfileRole(null);
          return;
        }
        setProfileRole(data?.role ?? null);
      })
      .catch(() => {
        if (!active) return;
        setProfileRole(null);
      });

    return () => {
      active = false;
    };
  }, [currentSession?.user?.id]);

  const user = currentSession?.user
    ? toSessionUser(
        currentSession.user,
        parseRole(String(profileRole ?? "user")),
      )
    : null;

  return (
    <Context
      value={{
        session: currentSession,
        user,
      }}
    >
      {children}
    </Context>
  );
}

export function useSession() {
  return use(Context)?.session;
}

export function useUser() {
  return use(Context)?.user ?? null;
}
