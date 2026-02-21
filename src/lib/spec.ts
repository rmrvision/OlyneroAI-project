import { capitalCase, kebabCase, snakeCase } from "change-case";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "phone", "number"]).default("text"),
});

const landingSpecSchema = z.object({
  type: z.literal("landing"),
  projectName: z.string().min(1),
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  cta: z.string().min(1),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(3),
});

const crudSpecSchema = z.object({
  type: z.literal("crud"),
  projectName: z.string().min(1),
  entity: z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    fields: z.array(fieldSchema).min(1),
  }),
});

export const projectSpecSchema = z.discriminatedUnion("type", [
  landingSpecSchema,
  crudSpecSchema,
]);

export type ProjectSpec = z.infer<typeof projectSpecSchema>;

function guessFieldType(name: string) {
  const lowered = name.toLowerCase();
  if (lowered.includes("email")) return "email" as const;
  if (lowered.includes("phone") || lowered.includes("tel"))
    return "phone" as const;
  if (lowered.includes("count") || lowered.includes("number"))
    return "number" as const;
  return "text" as const;
}

function parseCrud(prompt: string, projectName: string) {
  const match = prompt.match(/crud\s+([a-z0-9_\- ]+)(?:\(([^)]*)\))?/i);
  const rawEntity = match?.[1]?.trim() || "items";
  const entityName = snakeCase(rawEntity).replace(/\s+/g, "_");
  const label = capitalCase(
    entityName.endsWith("s") ? entityName.slice(0, -1) : entityName,
  );

  const rawFields = match?.[2]
    ? match[2]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const fields = (rawFields.length > 0 ? rawFields : ["name"]).map((field) => {
    const name = snakeCase(field);
    return {
      name,
      label: capitalCase(name),
      type: guessFieldType(name),
    };
  });

  return {
    type: "crud" as const,
    projectName,
    entity: {
      name: entityName,
      label,
      fields,
    },
  };
}

function parseLanding(prompt: string, projectName: string) {
  const cleanPrompt = prompt.trim();
  const headline =
    cleanPrompt.length > 10 ? cleanPrompt : `Launch ${projectName} faster.`;
  const subheadline =
    cleanPrompt.length > 10
      ? "A focused landing experience crafted from your brief."
      : "A focused landing experience crafted from your brief.";

  return {
    type: "landing" as const,
    projectName,
    headline,
    subheadline,
    cta: "Get early access",
    sections: [
      {
        title: "Instant positioning",
        description:
          "Capture the core value proposition with a crisp narrative.",
      },
      {
        title: "Fast iteration",
        description:
          "Iterate messaging and visuals without rebuilding layouts.",
      },
      {
        title: "Launch-ready",
        description: "Ship a polished landing with analytics-ready structure.",
      },
    ],
  };
}

export function parsePromptToSpec(
  prompt: string,
  projectName: string,
): ProjectSpec {
  const normalized = prompt.toLowerCase();
  const spec = normalized.includes("crud")
    ? parseCrud(prompt, projectName)
    : parseLanding(prompt, projectName);

  return projectSpecSchema.parse(spec);
}

export function getProjectSlug(name: string) {
  return kebabCase(name);
}
