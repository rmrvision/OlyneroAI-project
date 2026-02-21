import { readFile } from "node:fs/promises";
import path from "node:path";

export type TemplateInfo = {
  key: string;
  name: string;
  version: string;
  description: string;
};

export async function getTemplateCatalog(): Promise<TemplateInfo[]> {
  const metadataPath = path.join(process.cwd(), "templates", "metadata.json");
  try {
    const raw = await readFile(metadataPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, TemplateInfo>;
    return Object.values(parsed);
  } catch {
    return [
      {
        key: "landing",
        name: "Landing",
        version: "unknown",
        description: "Marketing landing template",
      },
      {
        key: "crud",
        name: "CRUD",
        version: "unknown",
        description: "Supabase-backed CRUD template",
      },
    ];
  }
}
