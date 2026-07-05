const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readPngInfo(filePath) {
  const data = fs.readFileSync(filePath);
  expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data.readUInt8(24),
    colorType: data.readUInt8(25)
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

describe("store asset exporter", () => {
  it("exports opaque store graphics with expected dimensions and manifest", () => {
    const outputRel = path.join("tmp", "spec", `store-assets-test-${process.pid}`);
    const outputAbs = path.join(root, outputRel);
    fs.rmSync(outputAbs, { recursive: true, force: true });

    try {
      const result = spawnSync(
        process.execPath,
        [
          "scripts/export-store-assets.cjs",
          "--output-dir",
          outputRel
        ],
        {
          cwd: root,
          encoding: "utf8"
        }
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Exported store assets/);

      const expectedAssets = [
        ["app-store-icon-1024.png", 1024, 1024],
        ["google-play-icon-512.png", 512, 512],
        ["google-play-feature-graphic-1024x500.png", 1024, 500]
      ];

      for (const [file, width, height] of expectedAssets) {
        const info = readPngInfo(path.join(outputAbs, file));
        expect(info).toEqual({
          width,
          height,
          bitDepth: 8,
          colorType: 2
        });
      }

      const manifest = readJson(path.join(outputAbs, "manifest.json"));
      expect(manifest).toEqual(
        expect.objectContaining({
          generatedBy: "scripts/export-store-assets.cjs",
          sourceIcon: "assets/icon.png",
          sourceBanner: "assets/banner.png"
        })
      );
      expect(manifest.assets).toEqual([
        expect.objectContaining({
          file: "app-store-icon-1024.png",
          width: 1024,
          height: 1024,
          alpha: false,
          target: "Apple App Store icon"
        }),
        expect.objectContaining({
          file: "google-play-icon-512.png",
          width: 512,
          height: 512,
          alpha: false,
          target: "Google Play app icon"
        }),
        expect.objectContaining({
          file: "google-play-feature-graphic-1024x500.png",
          width: 1024,
          height: 500,
          alpha: false,
          target: "Google Play feature graphic"
        })
      ]);
    } finally {
      fs.rmSync(outputAbs, { recursive: true, force: true });
    }
  });
});
