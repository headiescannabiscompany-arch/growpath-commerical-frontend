#!/usr/bin/env node

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const port = process.env.PLAYWRIGHT_WEB_PORT || "19025";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;
const expoCli = path.join(ROOT, "node_modules", "expo", "bin", "cli");
const playwrightCli = path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");
const playwrightArgs = process.argv.slice(2);

function spawnProcess(command, args, env = {}) {
  return spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true
  });
}

function requestUrl(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 180000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await requestUrl(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Expo web server did not become ready at ${url}`);
}

function killTree(child) {
  return new Promise((resolve) => {
    if (!child || !child.pid) return resolve();

    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      }).on("close", () => resolve());
      return;
    }

    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 3000).unref();
  });
}

async function main() {
  const expo = spawnProcess(
    process.execPath,
    [expoCli, "start", "--web", "--port", port, "--clear"],
    {
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002"
    }
  );

  let playwrightStatus = 1;
  try {
    await waitForServer(baseURL);

    playwrightStatus = await new Promise((resolve) => {
      const playwright = spawnProcess(
        process.execPath,
        [playwrightCli, "test", ...playwrightArgs],
        {
          PLAYWRIGHT_BASE_URL: baseURL,
          PLAYWRIGHT_SKIP_WEBSERVER: "1",
          PLAYWRIGHT_USE_SYSTEM_CHROME: process.env.PLAYWRIGHT_USE_SYSTEM_CHROME || "1",
          PLAYWRIGHT_DISABLE_VIDEO: process.env.PLAYWRIGHT_DISABLE_VIDEO || "1"
        }
      );
      playwright.on("exit", (code) => resolve(code ?? 1));
      playwright.on("error", () => resolve(1));
    });
  } finally {
    await killTree(expo);
  }

  process.exit(playwrightStatus);
}

main().catch(async (error) => {
  console.error(error?.message || error);
  process.exit(1);
});
