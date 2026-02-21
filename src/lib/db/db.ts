import type { Kysely } from "kysely";
import type { DB } from "@/lib/db/schema";

const db = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Database layer disabled. OlyneroAI uses Supabase; replace Kysely calls with Supabase clients.",
      );
    },
  },
) as Kysely<DB>;

export default db;
