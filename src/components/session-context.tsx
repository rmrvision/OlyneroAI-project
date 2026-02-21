import type {
  AuthChangeEvent,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { toSessionUser } from "@/lib/auth-common";
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

  const user = currentSession?.user
    ? toSessionUser(currentSession.user)
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
