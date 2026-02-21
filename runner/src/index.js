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
app.use(express.json({ limit: "5mb" }));

const RUNNER_SECRET = process.env.RUNNER_SECRET || "";
const RUNNER_PUBLIC_URL = process.env.RUNNER_PUBLIC_URL || "http://localhost";
const PORT = Number(process.env.PORT || 4010);

const TEMPLATE_ROOT = path.join(process.cwd(), "..", "templates");
const RUNS_ROOT = path.join(process.cwd(), "..", ".olynero", "runner");

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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/runs", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const {
    buildId,
    projectId,
    projectName,
    spec,
    callbackUrl,
    artifactUploadUrl,
  } = req.body ?? {};
  if (!buildId || !projectId || !projectName || !spec) {
    return res.status(400).json({ message: "Missing payload" });
  }

  const runId = crypto.randomUUID();
  res.json({ runId, status: "queued" });

  runBuild({
    runId,
    buildId,
    projectId,
    projectName,
    spec,
    callbackUrl,
    artifactUploadUrl,
  }).catch((error) => {
    console.error("Runner build failed", error);
  });
});

app.listen(PORT, () => {
  console.log(`Olynero runner listening on ${PORT}`);
});

function verifySignature(req) {
  if (!RUNNER_SECRET) return false;
  const signature = req.header("x-olynero-signature");
  const timestamp = req.header("x-olynero-timestamp");
  if (!signature || !timestamp) return false;
  const body = JSON.stringify(req.body ?? {});
  const signedPayload = `${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", RUNNER_SECRET)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function runBuild({
  runId,
  buildId,
  projectId,
  projectName,
  spec,
  callbackUrl,
  artifactUploadUrl,
}) {
  const runDir = path.join(RUNS_ROOT, runId);
  await mkdir(runDir, { recursive: true });

  const logLines = [];
  const appendLog = async (line) => {
    logLines.push(line);
    await writeFile(path.join(runDir, "runner.log"), logLines.join(""));
    await sendCallback(callbackUrl, {
      buildId,
      status: "running",
      logs: [line],
    });
  };

  await appendLog("Starting build...\n");

  const workspaceDir = await generateProject({
    spec,
    projectId,
    buildId,
    runDir,
    appendLog,
  });

  const buildResult = await runDockerBuild(workspaceDir, appendLog);

  let previewUrl = null;
  if (buildResult.ok) {
    previewUrl = await startPreviewContainer(workspaceDir, appendLog);
  }

  const artifactPath = await createZip(workspaceDir, runDir, appendLog);
  if (artifactUploadUrl) {
    await uploadArtifact(artifactUploadUrl, {
      buildId,
      projectId,
      artifactPath,
    });
  }

  const status = buildResult.ok ? "success" : "error";
  await sendCallback(callbackUrl, {
    buildId,
    status,
    logs: [
      buildResult.ok
        ? "Build succeeded.\n"
        : "Build failed.\n",
    ],
    previewUrl,
  });
}

async function generateProject({ spec, projectId, buildId, runDir, appendLog }) {
  const templateDir = path.join(TEMPLATE_ROOT, spec.type);
  const workspaceDir = path.join(runDir, projectId, buildId);
  await mkdir(workspaceDir, { recursive: true });
  await cp(templateDir, workspaceDir, { recursive: true });

  const replacements = buildReplacements(spec);
  await replaceTemplateTokens(workspaceDir, replacements);
  await appendLog("Template generated.\n");

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function escapeForTemplate(value) {
  return String(value).replace(/"/g, "\\\"");
}

async function replaceTemplateTokens(rootDir, replacements) {
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

async function collectFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

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

async function runDockerBuild(workspaceDir, appendLog) {
  return runDockerCommand(
    workspaceDir,
    ["npm", "install", "--no-audit", "--no-fund"],
    appendLog,
  ).then(async (install) => {
    if (!install.ok) return install;
    return runDockerCommand(workspaceDir, ["npm", "run", "build"], appendLog);
  });
}

async function runDockerCommand(workspaceDir, commandArgs, appendLog) {
  const image = process.env.RUNNER_NODE_IMAGE || "node:20-slim";
  const dockerArgs = [
    "run",
    "--rm",
    "--cpus=1",
    "--memory=1024m",
    "--pids-limit=256",
    "-v",
    `${workspaceDir}:/workspace`,
    "-w",
    "/workspace",
    image,
    "bash",
    "-lc",
    commandArgs.join(" "),
  ];

  await appendLog(`$ docker ${dockerArgs.join(" ")}\n`);

  return new Promise((resolve) => {
    const child = spawn("docker", dockerArgs, { env: process.env });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      appendLog("Build timed out.\n");
      resolve({ ok: false });
    }, 1000 * 60 * 15);

    child.stdout.on("data", (data) => appendLog(data.toString()));
    child.stderr.on("data", (data) => appendLog(data.toString()));

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0 });
    });
  });
}

async function startPreviewContainer(workspaceDir, appendLog) {
  const image = process.env.RUNNER_NODE_IMAGE || "node:20-slim";
  const dockerArgs = [
    "run",
    "-d",
    "--cpus=0.5",
    "--memory=512m",
    "-p",
    "0:3000",
    "-v",
    `${workspaceDir}:/workspace`,
    "-w",
    "/workspace",
    image,
    "bash",
    "-lc",
    "npm run start -H 0.0.0.0",
  ];

  await appendLog(`$ docker ${dockerArgs.join(" ")}\n`);

  const containerId = await new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs, { env: process.env });
    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(output));
      }
    });
  }).catch(async (error) => {
    await appendLog(`Failed to start preview: ${error.message}\n`);
    return null;
  });

  if (!containerId) {
    return null;
  }

  const port = await new Promise((resolve) => {
    const child = spawn("docker", ["port", containerId, "3000/tcp"]);
    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.on("close", () => {
      const match = output.trim().split(":").pop();
      resolve(match || "");
    });
  });

  if (!port) return null;

  return `${RUNNER_PUBLIC_URL.replace(/\/$/, "")}:${port}`;
}

async function createZip(workspaceDir, runDir, appendLog) {
  const artifactPath = path.join(runDir, "artifact.zip");
  const output = createWriteStream(artifactPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", async () => {
      await appendLog(`Artifact created: ${artifactPath}\n`);
      resolve(artifactPath);
    });

    archive.on("error", async (error) => {
      await appendLog(`Artifact error: ${error.message}\n`);
      reject(error);
    });

    archive.pipe(output);
    archive.directory(workspaceDir, false);
    archive.finalize();
  });
}

async function sendCallback(callbackUrl, payload) {
  if (!callbackUrl) return;
  try {
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", RUNNER_SECRET)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-olynero-signature": signature,
        "x-olynero-timestamp": timestamp,
      },
      body,
    });
  } catch (error) {
    console.error("Callback failed", error);
  }
}

async function uploadArtifact(artifactUploadUrl, { buildId, projectId, artifactPath }) {
  try {
    const buffer = await readFile(artifactPath);
    const form = new FormData();
    form.append("buildId", buildId);
    form.append("projectId", projectId);
    form.append(
      "artifact",
      new Blob([buffer], { type: "application/zip" }),
      "artifact.zip",
    );

    const payload = { buildId, projectId };
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac("sha256", RUNNER_SECRET)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest("hex");

    await fetch(artifactUploadUrl, {
      method: "POST",
      headers: {
        "x-olynero-signature": signature,
        "x-olynero-timestamp": timestamp,
      },
      body: form,
    });
  } catch (error) {
    console.error("Artifact upload failed", error);
  }
}
