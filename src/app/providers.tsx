"use client";

import { QueryCache, QueryClient } from "@tanstack/query-core";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session-context";
import { SidebarProvider } from "@/components/ui/sidebar";

let queryCache: QueryCache | undefined;
if (typeof window === "undefined") {
  queryCache = new (class extends QueryCache {
    add() {
      // noop
    }
  })();
}

const client = new QueryClient({ queryCache });

export default function Providers({
  session,
  children,
}: {
  session: SupabaseSession | null;
  children: ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={client}>
        <SidebarProvider>{children}</SidebarProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
