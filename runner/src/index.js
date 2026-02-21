import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));

const RUNNER_SECRET = process.env.RUNNER_SECRET || "";
const RUNNER_PUBLIC_URL = process.env.RUNNER_PUBLIC_URL || "http://localhost";
const PORT = Number(process.env.PORT || 4010);

const TEMPLATE_ROOT = path.join(process.cwd(), "..", "templates");
const RUNS_ROOT = path.join(process.cwd(), "..", ".olynero", "runner");

const TEXT_FILE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".mjs", ".html",
]);

app.get("/health", (_req, res) => {
  res.json({ ok: true, version: "2.0.0" });
});

app.post("/runs", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const { buildId, projectId, projectName, spec, files, callbackUrl, artifactUploadUrl } = req.body ?? {};

  if (!buildId || !projectId || !projectName) {
    return res.status(400).json({ message: "Missing payload" });
  }

  if (!files && !spec) {
    return res.status(400).json({ message: "Missing files or spec" });
  }

  const runId = crypto.randomUUID();
  res.json({ runId, status: "queued" });

  runBuild({ runId, buildId, projectId, projectName, spec, files, callbackUrl, artifactUploadUrl })
    .catch((error) => { console.error("Runner build failed", error); });
});

app.listen(PORT, () => {
  console.log(`Olynero runner v2.0 listening on ${PORT}`);
});

function verifySignature(req) {
  if (!RUNNER_SECRET) return false;
  const signature = req.header("x-olynero-signature");
  const timestamp = req.header("x-olynero-timestamp");
  if (!signature || !timestamp) return false;
  const body = JSON.stringify(req.body ?? {});
  const signedPayload = `${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", RUNNER_SECRET).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function runBuild({ runId, buildId, projectId, projectName, spec, files, callbackUrl, artifactUploadUrl }) {
  const runDir = path.join(RUNS_ROOT, runId);
  await mkdir(runDir, { recursive: true });

  const logLines = [];
  const appendLog = async (line) => {
    logLines.push(line);
    await writeFile(path.join(runDir, "runner.log"), logLines.join(""));
    await sendCallback(callbackUrl, { buildId, status: "running", logs: [line] });
  };

  await appendLog("[OlyneroAI Runner v2.0] Starting build...\n");

  let workspaceDir;
  const isViteReact = files && Array.isArray(files) && files.length > 0;

  if (isViteReact) {
    await appendLog(`[Runner] Mode: AI file generation (${files.length} files)\n`);
    workspaceDir = await generateFromFiles({ files, projectName, projectId, buildId, runDir, appendLog });
  } else {
    await appendLog(`[Runner] Mode: template (${spec?.type})\n`);
    workspaceDir = await generateFromTemplate({ spec, projectId, buildId, runDir, appendLog });
  }

  const buildResult = await runDockerBuild(workspaceDir, appendLog);

  let previewUrl = null;
  if (buildResult.ok) {
    previewUrl = await startPreviewContainer(workspaceDir, isViteReact, appendLog);
  }

  const artifactPath = await createZip(workspaceDir, runDir, appendLog);
  if (artifactUploadUrl) {
    await uploadArtifact(artifactUploadUrl, { buildId, projectId, artifactPath });
  }

  const status = buildResult.ok ? "success" : "error";
  await sendCallback(callbackUrl, {
    buildId,
    status,
    logs: [buildResult.ok ? "[Runner] Build succeeded.\n" : "[Runner] Build failed.\n"],
    previewUrl,
  });
}

async function generateFromFiles({ files, projectName, projectId, buildId, runDir, appendLog }) {
  const templateDir = path.join(TEMPLATE_ROOT, "vite-react");
  const workspaceDir = path.join(runDir, projectId, buildId);
  await mkdir(workspaceDir, { recursive: true });

  await cp(templateDir, workspaceDir, { recursive: true });
  await appendLog("[Runner] Base vite-react template copied.\n");

  const indexPath = path.join(workspaceDir, "index.html");
  let indexContent = await readFile(indexPath, "utf8");
  indexContent = indexContent.replaceAll("__PROJECT_NAME__", projectName);
  await writeFile(indexPath, indexContent, "utf8");

  for (const file of files) {
    const filePath = path.join(workspaceDir, file.path);
    const fileDir = path.dirname(filePath);
    await mkdir(fileDir, { recursive: true });
    await writeFile(filePath, file.content, "utf8");
    await appendLog(`[Runner] Written: ${file.path}\n`);
  }

  await appendLog(`[Runner] All ${files.length} files written.\n`);
  return workspaceDir;
}

async function generateFromTemplate({ spec, projectId, buildId, runDir, appendLog }) {
  const templateDir = path.join(TEMPLATE_ROOT, spec.type);
  const workspaceDir = path.join(runDir, projectId, buildId);
  await mkdir(workspaceDir, { recursive: true });
  await cp(templateDir, workspaceDir, { recursive: true });
  const replacements = buildReplacements(spec);
  await replaceTemplateTokens(workspaceDir, replacements);
  await appendLog("[Runner] Template generated.\n");
  return workspaceDir;
}

function buildReplacements(spec) {
  const replacements = {
    __PROJECT_NAME__: spec.projectName,
    __PROJECT_NAME_SLUG__: slugify(spec.projectName),
  };
  if (spec.type === "landing") {
    replacements.__HEADLINE__ = spec.headline;
    replacements.__SUBHEADLINE__ = spec.subheadline;
    replacements.__CTA__ = spec.cta;
    replacements.__FEATURES__ = spec.sections
      .map((s) => `{ title: "${escapeForTemplate(s.title)}", description: "${escapeForTemplate(s.description)}" }`)
      .join(",\n  ");
  }
  if (spec.type === "crud") {
    replacements.__ENTITY_NAME__ = spec.entity.name;
    replacements.__ENTITY_LABEL__ = spec.entity.label;
    replacements.__ENTITY_FIELDS__ = spec.entity.fields
      .map((f) => `{ name: "${escapeForTemplate(f.name)}", label: "${escapeForTemplate(f.label)}", type: "${f.type}" }`)
      .join(",\n  ");
  }
  return replacements;
}

function slugify(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""); }
function escapeForTemplate(v) { return String(v).replace(/"/g, "\\\""); }

async function replaceTemplateTokens(rootDir, replacements) {
  const files = await collectFiles(rootDir);
  for (const file of files) {
    if (!TEXT_FILE_EXTENSIONS.has(path.extname(file))) continue;
    let content = await readFile(file, "utf8");
    for (const [token, value] of Object.entries(replacements)) {
      content = content.replaceAll(token, value);
    }
    await writeFile(file, content, "utf8");
  }
}

async function collectFiles(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    if (entry === "node_modules") continue;
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

async function runDockerBuild(workspaceDir, appendLog) {
  const install = await runDockerCommand(workspaceDir, ["npm", "install", "--no-audit", "--no-fund"], appendLog);
  if (!install.ok) return install;
  return runDockerCommand(workspaceDir, ["npm", "run", "build"], appendLog);
}

async function runDockerCommand(workspaceDir, commandArgs, appendLog) {
  const image = process.env.RUNNER_NODE_IMAGE || "node:20-slim";
  const dockerArgs = [
    "run", "--rm", "--cpus=1", "--memory=1024m", "--pids-limit=512",
    "-v", `${workspaceDir}:/workspace`, "-w", "/workspace",
    image, "bash", "-lc", commandArgs.join(" "),
  ];
  await appendLog(`$ ${commandArgs.join(" ")}\n`);
  return new Promise((resolve) => {
    const child = spawn("docker", dockerArgs, { env: process.env });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      appendLog("[Runner] Timed out (15m).\n");
      resolve({ ok: false });
    }, 1000 * 60 * 15);
    child.stdout.on("data", (data) => appendLog(data.toString()));
    child.stderr.on("data", (data) => appendLog(data.toString()));
    child.on("close", (code) => { clearTimeout(timeout); resolve({ ok: code === 0 }); });
  });
}

async function startPreviewContainer(workspaceDir, isViteReact, appendLog) {
  const image = process.env.RUNNER_NODE_IMAGE || "node:20-slim";
  const startCmd = isViteReact ? "npm run preview" : "npm run start -- -H 0.0.0.0";
  const dockerArgs = [
    "run", "-d", "--cpus=0.5", "--memory=512m", "-p", "0:3000",
    "-v", `${workspaceDir}:/workspace`, "-w", "/workspace",
    image, "bash", "-lc", startCmd,
  ];
  await appendLog(`[Runner] Starting preview...\n`);
  const containerId = await new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs, { env: process.env });
    let output = "";
    child.stdout.on("data", (d) => { output += d.toString(); });
    child.stderr.on("data", (d) => { output += d.toString(); });
    child.on("close", (code) => { code === 0 ? resolve(output.trim()) : reject(new Error(output)); });
  }).catch(async (e) => { await appendLog(`[Runner] Preview failed: ${e.message}\n`); return null; });

  if (!containerId) return null;

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const port = await new Promise((resolve) => {
    const child = spawn("docker", ["port", containerId, "3000/tcp"]);
    let output = "";
    child.stdout.on("data", (d) => { output += d.toString(); });
    child.on("close", () => { resolve(output.trim().split(":").pop() || ""); });
  });

  if (!port) return null;
  const previewUrl = `${RUNNER_PUBLIC_URL.replace(/\/$/, "")}:${port}`;
  await appendLog(`[Runner] Preview at ${previewUrl}\n`);
  return previewUrl;
}

async function createZip(workspaceDir, runDir, appendLog) {
  const artifactPath = path.join(runDir, "artifact.zip");
  const output = createWriteStream(artifactPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  return new Promise((resolve, reject) => {
    output.on("close", async () => { await appendLog(`[Runner] Artifact ready.\n`); resolve(artifactPath); });
    archive.on("error", async (e) => { await appendLog(`[Runner] Zip error: ${e.message}\n`); reject(e); });
    archive.pipe(output);
    archive.glob("**/*", { cwd: workspaceDir, ignore: ["node_modules/**", ".next/**", "dist/**"] });
    archive.finalize();
  });
}

async function sendCallback(callbackUrl, payload) {
  if (!callbackUrl) return;
  try {
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", RUNNER_SECRET).update(`${timestamp}.${body}`).digest("hex");
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-olynero-signature": signature, "x-olynero-timestamp": timestamp },
      body,
    });
  } catch (e) { console.error("Callback failed", e); }
}

async function uploadArtifact(artifactUploadUrl, { buildId, projectId, artifactPath }) {
  try {
    const buffer = await readFile(artifactPath);
    const form = new FormData();
    form.append("buildId", buildId);
    form.append("projectId", projectId);
    form.append("artifact", new Blob([buffer], { type: "application/zip" }), "artifact.zip");
    const payload = { buildId, projectId };
    const timestamp = Date.now().toString();
    const signature = crypto.createHmac("sha256", RUNNER_SECRET).update(`${timestamp}.${JSON.stringify(payload)}`).digest("hex");
    await fetch(artifactUploadUrl, {
      method: "POST",
      headers: { "x-olynero-signature": signature, "x-olynero-timestamp": timestamp },
      body: form,
    });
  } catch (e) { console.error("Artifact upload failed", e); }
}
