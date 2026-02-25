#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const projectRoot = process.cwd();
const envFile =
  process.env.ENV_FILE && path.isAbsolute(process.env.ENV_FILE)
    ? process.env.ENV_FILE
    : path.join(projectRoot, process.env.ENV_FILE || ".env.test");

if (fs.existsSync(envFile)) {
  try {
    dotenv.config({ path: envFile });
  } catch (err) {
    console.warn(`Unable to load ${envFile}: ${err.message}`);
  }
}

const toAbsolute = (p) => {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.join(projectRoot, p);
};

const candidates = [];
if (process.env.BACKEND_DIR) candidates.push(toAbsolute(process.env.BACKEND_DIR));
candidates.push(path.resolve(projectRoot, "..", "growpath-backend"));
candidates.push(path.resolve(projectRoot, "..", "backend"));
candidates.push(path.join(projectRoot, "backend"));

const uniqueCandidates = candidates.filter(
  (dir, idx) => dir && candidates.indexOf(dir) === idx
);

const backendPath = uniqueCandidates.find((dir) =>
  fs.existsSync(path.join(dir, "package.json"))
);

if (!backendPath) {
  console.error(
    "Unable to locate a backend project. Set BACKEND_DIR in .env.test or place a backend folder next to this project."
  );
  process.exit(1);
}

const command = process.env.BACKEND_START_COMMAND || "npm run dev";
const shell = process.platform === "win32" ? "cmd" : "sh";
const shellArgs = process.platform === "win32" ? ["/c", command] : ["-c", command];

console.log(`Starting backend from: ${backendPath}`);
console.log(`Running command: ${command}`);

const child = spawn(shell, shellArgs, {
  cwd: backendPath,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(`Failed to start backend: ${err.message}`);
  process.exit(1);
});
