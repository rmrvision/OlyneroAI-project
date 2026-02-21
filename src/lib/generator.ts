import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getProjectSlug, type ProjectSpec } from "@/lib/spec";

const TEMPLATE_ROOT = path.join(process.cwd(), "templates");
const WORKSPACE_ROOT = path.join(process.cwd(), ".olynero", "projects");

const TEXT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".css",
  ".mjs",
]);

export async function generateProjectFromSpec(
  spec: ProjectSpec,
  options: { projectId: string; buildId: string },
) {
  const templateDir = path.join(TEMPLATE_ROOT, spec.type);
  const workspaceDir = path.join(
    WORKSPACE_ROOT,
    options.projectId,
    options.buildId,
  );

  await mkdir(workspaceDir, { recursive: true });
  await cp(templateDir, workspaceDir, { recursive: true });

  const replacements = buildReplacements(spec);
  await replaceTemplateTokens(workspaceDir, replacements);

  return workspaceDir;
}

function buildReplacements(spec: ProjectSpec) {
  const replacements: Record<string, string> = {
    __PROJECT_NAME__: spec.projectName,
    __PROJECT_NAME_SLUG__: getProjectSlug(spec.projectName),
  };

  if (spec.type === "landing") {
    replacements.__HEADLINE__ = spec.headline;
    replacements.__SUBHEADLINE__ = spec.subheadline;
    replacements.__CTA__ = spec.cta;
    replacements.__FEATURES__ = spec.sections
      .map(
        (section) =>
          `{ title: "${escapeForTemplate(section.title)}", description: "${escapeForTemplate(section.description)}" }`,
      )
      .join(",\n  ");
  }

  if (spec.type === "crud") {
    replacements.__ENTITY_NAME__ = spec.entity.name;
    replacements.__ENTITY_LABEL__ = spec.entity.label;
    replacements.__ENTITY_FIELDS__ = spec.entity.fields
      .map(
        (field) =>
          `{ name: "${escapeForTemplate(field.name)}", label: "${escapeForTemplate(field.label)}", type: "${field.type}" }`,
      )
      .join(",\n  ");
  }

  return replacements;
}

function escapeForTemplate(value: string) {
  return value.replace(/"/g, "\\\"");
}

async function replaceTemplateTokens(
  rootDir: string,
  replacements: Record<string, string>,
) {
  const files = await collectFiles(rootDir);

  for (const file of files) {
    if (!TEXT_FILE_EXTENSIONS.has(path.extname(file))) {
      continue;
    }
    let content = await readFile(file, "utf8");
    for (const [token, value] of Object.entries(replacements)) {
      content = content.replaceAll(token, value);
    }
    await writeFile(file, content, "utf8");
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);
    if (entryStat.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function runLocalBuild(workspaceDir: string) {
  const logs: string[] = [];

  const install = await runCommand(
    "npm",
    ["install", "--no-audit", "--no-fund"],
    workspaceDir,
    logs,
  );
  if (!install.ok) {
    return { ok: false, logs };
  }

  const build = await runCommand("npm", ["run", "build"], workspaceDir, logs);

  return { ok: build.ok, logs };
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  logs: string[],
) {
  return new Promise<{ ok: boolean }>((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env });

    child.stdout.on("data", (data) => {
      logs.push(data.toString());
    });

    child.stderr.on("data", (data) => {
      logs.push(data.toString());
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0 });
    });
  });
}
