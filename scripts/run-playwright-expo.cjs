#!/usr/bin/env node

const http = require("http");
const https = require("https");
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const port = process.env.PLAYWRIGHT_WEB_PORT || "19025";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;
const expoCli = path.join(ROOT, "node_modules", "expo", "bin", "cli");
const playwrightCli = path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");
const playwrightArgs = process.argv.slice(2);
const serverTimeoutMs = readTimeout("PLAYWRIGHT_SERVER_TIMEOUT_MS", 300000);
const prewarmTimeoutMs = readTimeout("PLAYWRIGHT_PREWARM_TIMEOUT_MS", 300000);

function readTimeout(name, fallback) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function spawnProcess(command, args, env = {}) {
  return spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true
  });
}

function expoStartArgs(
  targetPort,
  clearCache = process.env.PLAYWRIGHT_CLEAR_CACHE === "1"
) {
  return [
    expoCli,
    "start",
    "--web",
    "--port",
    String(targetPort),
    ...(clearCache ? ["--clear"] : [])
  ];
}

function canConnect(url) {
  return new Promise((resolve) => {
    const target = new URL(url);
    let settled = false;
    const socket = net.createConnection({
      host: target.hostname,
      port: Number(target.port || (target.protocol === "https:" ? 443 : 80))
    });

    const finish = (connected) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1000, () => {
      finish(false);
    });
  });
}

function fetchUrl(url, timeoutMs, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.get(target, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();
        if (redirectCount >= 5) {
          reject(new Error(`Too many redirects while prewarming ${url}`));
          return;
        }
        fetchUrl(new URL(location, target).toString(), timeoutMs, redirectCount + 1).then(
          resolve,
          reject
        );
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Expo prewarm request failed (${statusCode}) for ${target}`));
          return;
        }
        resolve({
          body: Buffer.concat(chunks).toString("utf8"),
          url: target.toString()
        });
      });
    });

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(
        new Error(`Expo prewarm request timed out after ${timeoutMs}ms: ${url}`)
      );
    });
  });
}

function getScriptUrls(html, documentUrl) {
  const urls = [];
  const scriptPattern = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi;
  let match;

  while ((match = scriptPattern.exec(html))) {
    const src = match[2].replace(/&amp;/g, "&");
    const resolved = new URL(src, documentUrl);
    if (resolved.origin === new URL(documentUrl).origin) {
      urls.push(resolved.toString());
    }
  }

  return [...new Set(urls)];
}

async function prewarmExpoWeb(url, timeoutMs = prewarmTimeoutMs) {
  console.log(`[playwright-expo] Prewarming Expo web bundle at ${url}`);
  const document = await fetchUrl(url, timeoutMs);
  const scriptUrls = getScriptUrls(document.body, document.url);

  if (scriptUrls.length === 0) {
    throw new Error(
      `Expo web document did not contain a same-origin script bundle: ${url}`
    );
  }

  await Promise.all(scriptUrls.map((scriptUrl) => fetchUrl(scriptUrl, timeoutMs)));
  console.log(
    `[playwright-expo] Expo web prewarm complete (${scriptUrls.length} script${
      scriptUrls.length === 1 ? "" : "s"
    })`
  );
}

async function waitForServer(url, timeoutMs = serverTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Expo web server did not open a listener at ${url}`);
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
  const expo = spawnProcess(process.execPath, expoStartArgs(port), {
    CI: "1",
    EXPO_NO_TELEMETRY: "1",
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002"
  });

  let playwrightStatus = 1;
  try {
    await waitForServer(baseURL);
    await prewarmExpoWeb(baseURL);

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

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

module.exports = {
  expoStartArgs,
  getScriptUrls,
  prewarmExpoWeb
};
