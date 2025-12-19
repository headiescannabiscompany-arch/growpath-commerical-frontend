#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

const projectRoot = process.cwd();
const envFile =
  process.env.ENV_FILE && path.isAbsolute(process.env.ENV_FILE)
    ? process.env.ENV_FILE
    : path.join(projectRoot, process.env.ENV_FILE || ".env.test");

if (envFile) {
  try {
    require("dotenv").config({ path: envFile });
  } catch (err) {
    console.warn(`Unable to load ${envFile}: ${err.message}`);
  }
}

const commands =
  process.env.ACCEPTANCE_COMMANDS || 'npm test -- "tests/acceptance/*.test.js"';
const shell = process.platform === "win32" ? "cmd" : "sh";
const shellArgs = process.platform === "win32" ? ["/c", commands] : ["-c", commands];

console.log(`Running acceptance commands: ${commands}`);

const child = spawn(shell, shellArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(`Acceptance command failed: ${err.message}`);
  process.exit(1);
});
