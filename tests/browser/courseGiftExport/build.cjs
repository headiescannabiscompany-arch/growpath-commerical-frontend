"use strict";
// Installed Metro only; no Expo release/export, registry access or package install.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const inherited = process.env;
process.env = Object.fromEntries(
  ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]
    .filter((k) => inherited[k] !== undefined)
    .map((k) => [k, inherited[k]])
);
process.env.NODE_ENV = "test";
const root = path.resolve(__dirname, "../../..");
const { getDefaultConfig } = require("expo/metro-config"),
  Metro = require("metro");
async function main() {
  const folder = fs.mkdtempSync(
    path.join(os.tmpdir(), "growpath-export-browser-bundle-")
  );
  const config = getDefaultConfig(root);
  config.watchFolders = [
    root,
    fs.realpathSync(path.join(root, "node_modules")),
    ...config.watchFolders
  ];
  config.maxWorkers = 1;
  config.fileMapCacheDirectory = path.join(folder, "file-map");
  fs.mkdirSync(config.fileMapCacheDirectory);
  config.cacheStores = [
    new (require("metro-cache").FileStore)({ root: path.join(folder, "transforms") })
  ];
  config.resolver.useWatchman = false;
  config.resolver.resolveRequest = (context, name, platform) => {
    const shim = path.join(__dirname, "shims.tsx");
    if (
      name === "expo-router" ||
      [
        "@/auth/AuthContext",
        "@/entitlements",
        "@/theme/appTheme",
        "@/api/auth",
        "@/api/videos"
      ].includes(name) ||
      name.startsWith("@/components/") ||
      name === "@/features/billing/AccountBillingSummary"
    )
      name = shim;
    if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
    if (/(?:^|\/)auth\/tokenStore$/.test(name.replaceAll("\\", "/"))) name = shim;
    if (name === "react-native") name = "react-native-web";
    return context.resolveRequest(
      {
        ...context,
        preferNativePlatform: false,
        mainFields: ["browser", "module", "main"],
        unstable_conditionNames: ["browser", "require"]
      },
      name,
      platform
    );
  };
  try {
    await Metro.runBuild(config, {
      entry: path.join(__dirname, "entry.tsx"),
      out: path.join(folder, "fixture.js"),
      platform: "web",
      dev: false,
      minify: false,
      sourceMap: false
    });
    console.log(JSON.stringify({ bundle: path.join(folder, "fixture.js") }));
  } catch (error) {
    const resolved = fs.realpathSync(folder);
    if (
      path.dirname(resolved) === fs.realpathSync(os.tmpdir()) &&
      path.basename(resolved).startsWith("growpath-export-browser-bundle-") &&
      !fs.lstatSync(folder).isSymbolicLink()
    )
      fs.rmSync(resolved, { recursive: true, force: false });
    throw error;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
