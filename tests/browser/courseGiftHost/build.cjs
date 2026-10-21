"use strict";
// Isolated navigation fixture; no Expo app/export/deployment or public flag.
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const stagingWeb = process.argv.includes("--staging-web");
const backendEntry = stagingWeb || process.argv.includes("--course-backend");
const courseEntry = backendEntry || process.argv.includes("--course-entry");
const fixtureDir = backendEntry
  ? path.resolve(__dirname, "../courseGiftBackend")
  : courseEntry
    ? path.resolve(__dirname, "../courseGiftEntry")
    : __dirname;
const inherited = process.env;
process.env = Object.fromEntries(
  ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]
    .filter((key) => inherited[key] !== undefined)
    .map((key) => [key, inherited[key]])
);
process.env.NODE_ENV = "test";
const root = path.resolve(__dirname, "../../..");
const { getDefaultConfig } = require("expo/metro-config");
const Metro = require("metro");
async function main() {
  const tempRoot = fs.realpathSync(
    path.resolve(root, "../../outputs/tmp-course-gift-host-20261016")
  );
  if (fs.realpathSync(os.tmpdir()).toLowerCase() !== tempRoot.toLowerCase())
    throw new Error("Only this task's exact temporary root is permitted");
  const folder = fs.mkdtempSync(path.join(tempRoot, "growpath-gift-host-bundle-"));
  try {
    let stagingContext;
    if (stagingWeb) {
      // Test artifact only: keep the application module and its production pins
      // unchanged. Browser traffic remains loopback; never visit a hosted origin.
      const sourceFile = path.join(root, "src/utils/courseGiftStagingWebContext.ts");
      const original = fs.readFileSync(sourceFile, "utf8");
      let synthetic = original;
      for (const [from, to] of [
        [
          'const WEB = "https://growpath-web-staging.onrender.com";',
          "const WEB = window.location.origin;"
        ],
        [
          'const API = "https://growpath-api-staging.onrender.com";',
          "const API = window.location.origin;"
        ],
        [
          "browser!.location.assign(url);",
          'browser!.dispatchEvent(new Event("course-gift-fixture-checkout"));'
        ]
      ]) {
        if (synthetic.split(from).length !== 2)
          throw Error("Unexpected staging seam source");
        synthetic = synthetic.replace(from, to);
      }
      synthetic = `if (typeof window === "undefined" || window.location.hostname !== "127.0.0.1" || window.location.protocol !== "http:") throw Error("Loopback fixture only");\n${synthetic}`;
      stagingContext = path.join(folder, "stagingContext.ts");
      fs.writeFileSync(stagingContext, synthetic);
      console.log(
        JSON.stringify({
          stagingWebSourceSha256: require("node:crypto")
            .createHash("sha256")
            .update(original)
            .digest("hex"),
          testOnlySeams: [
            "website/API loopback targets",
            "checkout navigation becomes local event"
          ]
        })
      );
    }
    const config = getDefaultConfig(root);
    config.watchFolders = [
      root,
      fs.realpathSync(path.join(root, "node_modules")),
      ...config.watchFolders
    ];
    if (stagingWeb) {
      config.watchFolders.push(folder);
      config.resolver.nodeModulesPaths = [
        path.join(root, "node_modules"),
        ...(config.resolver.nodeModulesPaths || [])
      ];
    }
    config.maxWorkers = 1;
    config.fileMapCacheDirectory = path.join(folder, "file-map");
    fs.mkdirSync(config.fileMapCacheDirectory);
    const { FileStore } = require("metro-cache");
    config.cacheStores = [new FileStore({ root: path.join(folder, "transforms") })];
    config.resolver.useWatchman = false;
    config.resolver.resolveRequest = (context, name, platform) => {
      const normalized = name.startsWith("@/")
        ? path.join(root, "src", name.slice(2)).replaceAll("\\", "/")
        : name.startsWith(".")
          ? path
              .resolve(path.dirname(context.originModulePath), name)
              .replaceAll("\\", "/")
          : name;
      if (stagingWeb && normalized.endsWith("/src/utils/courseGiftStagingWebContext"))
        name = stagingContext;
      else if (
        stagingWeb &&
        normalized.endsWith("/src/components/courseGifts/CourseGiftCourseEntry") &&
        context.originModulePath
          .replaceAll("\\", "/")
          .endsWith("/courseGiftBackend/entry.tsx")
      )
        name = path.resolve(__dirname, "../courseGiftStagingWeb/boundary.tsx");
      else if (
        courseEntry &&
        /\/src\/(api\/(apiRequest|courses|coursePayments|commercialWorkflows|reports|grows|tasks|uploads)|entitlements|state\/useFacility|features\/learning\/learningAccess)$/.test(
          normalized
        )
      )
        name =
          backendEntry &&
          normalized.endsWith("/api/apiRequest") &&
          context.originModulePath
            .replaceAll("\\", "/")
            .endsWith("/courseGiftBackend/seams.ts")
            ? normalized
            : path.join(fixtureDir, "seams.ts");
      else if (
        courseEntry &&
        /\/src\/components\/(feed\/PersonalFeedPlacement|sharing\/PublicShareActions|learning\/(LessonMediaCard|AuthorizedCourseImage|LessonMediaSourceEditor)|videos\/VideoLibraryPicker)$/.test(
          normalized
        )
      )
        name = path.resolve(__dirname, "../courseGiftEntry/empty.tsx");
      else if (courseEntry && normalized.endsWith("/src/components/layout/AppPage"))
        name = path.resolve(__dirname, "../courseGiftEntry/page.tsx");
      else if (name === "@/auth/AuthContext")
        name = backendEntry
          ? path.join(fixtureDir, "auth.tsx")
          : path.join(__dirname, "auth.tsx");
      // Entry checks use the actual gift HTTP adapter, with only apiRequest replaced.
      else if (!courseEntry && name === "@/api/courseGiftHttp")
        name = path.join(__dirname, "http.ts");
      else if (name === "@/utils/courseGiftWebSession")
        name = path.join(__dirname, "session.ts");
      else if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
      if (/(?:^|\/)auth\/tokenStore$/.test(name.replaceAll("\\", "/")))
        name = path.join(__dirname, "../courseGift/tokenStore.ts");
      if (name === "react-native") name = "react-native-web";
      // Unlike 04C, expo-router is NOT substituted.
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
    await Metro.runBuild(config, {
      entry: path.join(fixtureDir, "entry.tsx"),
      out: path.join(folder, "fixture.js"),
      platform: "web",
      // Keep NODE_ENV dynamic for the explicit test-only entry boundary. Only the
      // local fixture sets it to test; no application gate is rewritten.
      dev: courseEntry,
      minify: false,
      sourceMap: false
    });
    console.log(JSON.stringify({ bundle: path.join(folder, "fixture.js") }));
  } catch (error) {
    fs.rmSync(folder, { recursive: true, force: true }); // Exact new mkdtemp child.
    throw error;
  }
}
main().catch(() => {
  console.error("Host fixture compilation failed");
  process.exitCode = 1;
});
