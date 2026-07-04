const { spawn } = require("child_process");
const path = require("path");

const port = process.argv[2] || process.env.PLAYWRIGHT_WEB_PORT || "8081";
const root = path.resolve(__dirname, "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");

const child = spawn(
  process.execPath,
  [expoCli, "start", "--web", "--port", port, "--clear"],
  {
    cwd: root,
    env: {
      ...process.env,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002"
    },
    stdio: "inherit",
    windowsHide: true
  }
);

let stopping = false;

function stop(signal) {
  if (stopping) return;
  stopping = true;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    }).on("close", () => process.exit(signal ? 0 : 1));
    return;
  }

  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
    process.exit(signal ? 0 : 1);
  }, 3000).unref();
}

child.on("exit", (code, signal) => {
  if (stopping) return;
  process.exit(code ?? (signal ? 1 : 0));
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGBREAK", () => stop("SIGBREAK"));
