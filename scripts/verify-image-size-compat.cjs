"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Worker } = require("node:worker_threads");

const EXPECTED_ADAPTER_VERSION = "1.2.1-compat.2.0.4";
const EXPECTED_UPSTREAM_VERSION = "2.0.4";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const VENDOR_DIRECTORY = path.join(PROJECT_ROOT, "vendor/image-size-compat");
const INSTALLED_DIRECTORY = path.join(PROJECT_ROOT, "node_modules/image-size");
const ADAPTER_FILES = ["package.json", "index.cjs", "index.d.ts", "LICENSE", "README.md"];
const PNG_1_BY_1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2S8AAAAASUVORK5CYII=",
  "base64"
);
const JPEG_2_BY_3 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x02
]);
const SVG_2_BY_3 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"></svg>'
);

function findPackageManifest(moduleEntry, expectedName) {
  let directory = path.dirname(fs.realpathSync(moduleEntry));
  const filesystemRoot = path.parse(directory).root;

  while (directory !== filesystemRoot) {
    const candidate = path.join(directory, "package.json");
    if (fs.existsSync(candidate)) {
      const manifest = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (manifest.name === expectedName) {
        return { manifest, manifestPath: candidate };
      }
    }
    directory = path.dirname(directory);
  }

  throw new Error(`Could not locate ${expectedName} package.json from ${moduleEntry}`);
}

function sha256(filepath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filepath)).digest("hex");
}

function verifyInstalledAdapterMatchesSource() {
  for (const relativePath of ADAPTER_FILES) {
    const sourcePath = path.join(VENDOR_DIRECTORY, relativePath);
    const installedPath = path.join(INSTALLED_DIRECTORY, relativePath);
    assert.ok(fs.existsSync(sourcePath), `missing adapter source: ${sourcePath}`);
    assert.ok(
      fs.existsSync(installedPath),
      `missing installed adapter file: ${installedPath}`
    );
    assert.equal(
      sha256(installedPath),
      sha256(sourcePath),
      `installed adapter differs from reviewed source: ${relativePath}`
    );
  }
}

function verifyLockfileGraph() {
  const lock = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "package-lock.json"), "utf8")
  );
  const packages = lock.packages || {};
  const rootAdapter = packages["node_modules/image-size"];
  const vendorAdapter = packages["vendor/image-size-compat"];
  const modernPackage = packages["node_modules/image-size-modern"];

  assert.equal(rootAdapter?.link, true);
  assert.equal(rootAdapter?.resolved?.replace(/\\/g, "/"), "vendor/image-size-compat");
  assert.equal(vendorAdapter?.version, EXPECTED_ADAPTER_VERSION);
  assert.equal(
    vendorAdapter?.dependencies?.["image-size-modern"],
    `npm:image-size@${EXPECTED_UPSTREAM_VERSION}`
  );
  assert.equal(modernPackage?.name, "image-size");
  assert.equal(modernPackage?.version, EXPECTED_UPSTREAM_VERSION);
  assert.match(modernPackage?.resolved || "", /image-size-2\.0\.4\.tgz$/);
  assert.match(modernPackage?.integrity || "", /^sha512-/);

  for (const [packagePath, metadata] of Object.entries(packages)) {
    const normalizedPath = packagePath.replace(/\\/g, "/");
    const isImageSizeInstall =
      normalizedPath === "node_modules/image-size" ||
      normalizedPath.endsWith("/node_modules/image-size");
    const isModernAlias =
      normalizedPath === "node_modules/image-size-modern" ||
      normalizedPath.endsWith("/node_modules/image-size-modern");

    if (isImageSizeInstall) {
      assert.equal(
        normalizedPath,
        "node_modules/image-size",
        `unexpected nested image-size parser remains: ${normalizedPath}`
      );
      assert.equal(metadata.link, true);
    }

    if (isModernAlias) {
      assert.equal(
        metadata.version,
        EXPECTED_UPSTREAM_VERSION,
        `unexpected image-size parser version at ${normalizedPath}`
      );
    }

    if (
      metadata.name === "image-size" &&
      /^1\./.test(metadata.version || "") &&
      normalizedPath !== "vendor/image-size-compat"
    ) {
      assert.fail(
        `vulnerable image-size 1.x parser remains in lockfile: ${normalizedPath}`
      );
    }
  }
}

function removeTemporaryDirectory(directory) {
  const resolvedDirectory = path.resolve(directory);
  const resolvedTempRoot = `${path.resolve(os.tmpdir())}${path.sep}`;
  assert.ok(resolvedDirectory.startsWith(resolvedTempRoot));
  assert.match(path.basename(resolvedDirectory), /^growpath-image-size-integration-/);
  fs.rmSync(resolvedDirectory, { recursive: true, force: true });
}

function verifyMalformedInputFailsFast(moduleEntry, fixture, expectedMessage) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
        const { parentPort, workerData } = require('node:worker_threads');
        const modern = require(workerData.moduleEntry);
        try {
          modern.imageSize(Buffer.from(workerData.fixture, 'base64'));
          parentPort.postMessage({ returned: true });
        } catch (error) {
          parentPort.postMessage({
            returned: false,
            name: error?.name,
            message: error?.message,
          });
        }
      `,
      {
        eval: true,
        workerData: {
          moduleEntry,
          fixture: fixture.toString("base64")
        }
      }
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`patched parser did not terminate for ${expectedMessage}`));
    }, 3_000);

    worker.once("message", (result) => {
      clearTimeout(timeout);
      worker.terminate();
      try {
        assert.equal(result.returned, false);
        assert.equal(result.name, "TypeError");
        assert.match(result.message, expectedMessage);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    worker.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function maliciousIcnsFixture() {
  const fixture = Buffer.alloc(16);
  fixture.write("icns", 0, "ascii");
  fixture.writeUInt32BE(16, 4);
  fixture.write("ic07", 8, "ascii");
  fixture.writeUInt32BE(0, 12);
  return fixture;
}

function maliciousHeifFixture() {
  const fixture = Buffer.alloc(24);
  fixture.writeUInt32BE(16, 0);
  fixture.write("ftyp", 4, "ascii");
  fixture.write("heic", 8, "ascii");
  fixture.writeUInt32BE(0, 16);
  fixture.write("junk", 20, "ascii");
  return fixture;
}

function maliciousJxlFixture() {
  const fixture = Buffer.alloc(36);
  fixture.writeUInt32BE(12, 0);
  fixture.write("JXL ", 4, "ascii");
  fixture.writeUInt32BE(16, 12);
  fixture.write("ftyp", 16, "ascii");
  fixture.write("jxl ", 20, "ascii");
  fixture.writeUInt32BE(0, 28);
  fixture.write("junk", 32, "ascii");
  return fixture;
}

function imageSizeWithCallback(imageSize, filepath) {
  return new Promise((resolve, reject) => {
    const returnValue = imageSize(filepath, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ result, returnValue });
    });
    assert.equal(returnValue, undefined);
  });
}

async function main() {
  verifyInstalledAdapterMatchesSource();
  verifyLockfileGraph();

  const imageSize = require("image-size");
  const modern = require("image-size-modern");
  const adapterPackage = findPackageManifest(require.resolve("image-size"), "image-size");
  const modernPackage = findPackageManifest(
    require.resolve("image-size-modern"),
    "image-size"
  );

  assert.equal(adapterPackage.manifest.version, EXPECTED_ADAPTER_VERSION);
  assert.equal(modernPackage.manifest.version, EXPECTED_UPSTREAM_VERSION);
  assert.equal(adapterPackage.manifest.private, true);
  assert.equal(
    adapterPackage.manifest.dependencies["image-size-modern"],
    `npm:image-size@${EXPECTED_UPSTREAM_VERSION}`
  );

  assert.equal(typeof imageSize, "function");
  assert.equal(imageSize.default, imageSize);
  assert.equal(imageSize.imageSize, imageSize);
  assert.equal(typeof imageSize.disableTypes, "function");
  assert.equal(typeof modern.disableTypes, "function");
  assert.ok(imageSize.types.includes("png"));

  assert.deepEqual(imageSize(PNG_1_BY_1), {
    width: 1,
    height: 1,
    type: "png"
  });
  assert.deepEqual(imageSize(JPEG_2_BY_3), {
    width: 2,
    height: 3,
    type: "jpg"
  });
  assert.deepEqual(imageSize(SVG_2_BY_3), {
    width: 2,
    height: 3,
    type: "svg"
  });

  const modernEntry = require.resolve("image-size-modern");
  await verifyMalformedInputFailsFast(
    modernEntry,
    maliciousIcnsFixture(),
    /Invalid ICNS/
  );
  await verifyMalformedInputFailsFast(
    modernEntry,
    maliciousHeifFixture(),
    /Invalid HEIF/
  );
  await verifyMalformedInputFailsFast(modernEntry, maliciousJxlFixture(), /Invalid JXL/);

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "growpath-image-size-integration-")
  );
  const pngPath = path.join(temporaryDirectory, "one.png");
  const emptyPath = path.join(temporaryDirectory, "empty.png");

  try {
    fs.writeFileSync(pngPath, PNG_1_BY_1);
    fs.writeFileSync(emptyPath, Buffer.alloc(0));

    assert.deepEqual(imageSize(pngPath), {
      width: 1,
      height: 1,
      type: "png"
    });
    assert.deepEqual((await imageSizeWithCallback(imageSize, pngPath)).result, {
      width: 1,
      height: 1,
      type: "png"
    });
    assert.throws(() => imageSize(emptyPath), /Empty file/);

    imageSize.disableFS(true);
    assert.throws(
      () => imageSize(pngPath),
      /invalid invocation\. input should be a Uint8Array/
    );
    assert.deepEqual(imageSize(PNG_1_BY_1), {
      width: 1,
      height: 1,
      type: "png"
    });
    imageSize.disableFS(false);

    imageSize.disableTypes(["png"]);
    assert.throws(() => imageSize(PNG_1_BY_1), /disabled file type: png/);
    imageSize.disableTypes([]);
    imageSize.setConcurrency(1);
    imageSize.setConcurrency(100);

    const { getAssetSize } = require("metro/private/Assets");
    assert.deepEqual(getAssetSize("png", PNG_1_BY_1, pngPath), {
      width: 1,
      height: 1
    });
  } finally {
    imageSize.disableFS(false);
    imageSize.disableTypes([]);
    imageSize.setConcurrency(100);
    removeTemporaryDirectory(temporaryDirectory);
  }

  console.log(
    `image-size compatibility verified: adapter ${EXPECTED_ADAPTER_VERSION}, upstream ${EXPECTED_UPSTREAM_VERSION}, Metro callable API`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
