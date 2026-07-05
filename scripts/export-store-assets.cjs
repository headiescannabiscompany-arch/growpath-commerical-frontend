#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Jimp = require("jimp-compact");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { outputDir: path.join("store-assets", "graphics") };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output-dir" || arg === "--outputDir" || arg === "-OutputDir") {
      args.outputDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function colorToInt(hex) {
  const normalized = hex.replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid color: ${hex}`);
  }
  return (Number.parseInt(normalized, 16) << 8) | 0xff;
}

function forceOpaque(image) {
  const { data } = image.bitmap;
  for (let index = 3; index < data.length; index += 4) {
    data[index] = 255;
  }
}

async function writeOpaquePng(image, destination) {
  forceOpaque(image);
  const png = {
    width: image.bitmap.width,
    height: image.bitmap.height,
    data: image.bitmap.data
  };
  fs.writeFileSync(destination, PNG.sync.write(png, { colorType: 2 }));
}

async function createStoreImage({
  source,
  destination,
  width,
  height,
  mode = "fit",
  background = "#1A1A1A",
  ignoreSourceAlpha = false
}) {
  const sourceImage = await Jimp.read(source);
  if (ignoreSourceAlpha) {
    forceOpaque(sourceImage);
  }

  const canvas = new Jimp(width, height, colorToInt(background));
  const drawSource = sourceImage.clone();
  const targetAspect = width / height;
  const sourceAspect = drawSource.bitmap.width / drawSource.bitmap.height;

  if (mode === "cover") {
    if (sourceAspect > targetAspect) {
      const cropHeight = drawSource.bitmap.height;
      const cropWidth = Math.round(cropHeight * targetAspect);
      const cropX = Math.round((drawSource.bitmap.width - cropWidth) / 2);
      drawSource.crop(cropX, 0, cropWidth, cropHeight);
    } else {
      const cropWidth = drawSource.bitmap.width;
      const cropHeight = Math.round(cropWidth / targetAspect);
      const cropY = Math.round((drawSource.bitmap.height - cropHeight) / 2);
      drawSource.crop(0, cropY, cropWidth, cropHeight);
    }
    drawSource.resize(width, height, Jimp.RESIZE_BICUBIC);
    canvas.composite(drawSource, 0, 0);
  } else {
    const scale = Math.min(
      width / drawSource.bitmap.width,
      height / drawSource.bitmap.height
    );
    const drawWidth = Math.round(drawSource.bitmap.width * scale);
    const drawHeight = Math.round(drawSource.bitmap.height * scale);
    const drawX = Math.round((width - drawWidth) / 2);
    const drawY = Math.round((height - drawHeight) / 2);
    drawSource.resize(drawWidth, drawHeight, Jimp.RESIZE_BICUBIC);
    canvas.composite(drawSource, drawX, drawY);
  }

  await writeOpaquePng(canvas, destination);
}

function readPngInfo(filePath) {
  const data = fs.readFileSync(filePath);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data.readUInt8(25)
  };
}

function assertImage(filePath, width, height) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing generated asset: ${filePath}`);
  }

  const info = readPngInfo(filePath);
  if (info.width !== width || info.height !== height) {
    throw new Error(
      `Invalid dimensions for ${filePath}. Expected ${width}x${height}, got ${info.width}x${info.height}.`
    );
  }
  if (info.colorType !== 2) {
    throw new Error(`Generated asset still has alpha channel: ${filePath}`);
  }
}

async function main() {
  const { outputDir } = parseArgs(process.argv.slice(2));
  const out = path.resolve(ROOT, outputDir);
  fs.mkdirSync(out, { recursive: true });

  const icon = path.join(ROOT, "assets", "icon.png");
  const banner = path.join(ROOT, "assets", "banner.png");
  const appStoreIcon = path.join(out, "app-store-icon-1024.png");
  const googlePlayIcon = path.join(out, "google-play-icon-512.png");
  const googleFeature = path.join(out, "google-play-feature-graphic-1024x500.png");
  const manifest = path.join(out, "manifest.json");

  await createStoreImage({
    source: icon,
    destination: appStoreIcon,
    width: 1024,
    height: 1024,
    mode: "fit",
    ignoreSourceAlpha: true
  });
  await createStoreImage({
    source: icon,
    destination: googlePlayIcon,
    width: 512,
    height: 512,
    mode: "fit",
    ignoreSourceAlpha: true
  });
  await createStoreImage({
    source: banner,
    destination: googleFeature,
    width: 1024,
    height: 500,
    mode: "cover"
  });

  assertImage(appStoreIcon, 1024, 1024);
  assertImage(googlePlayIcon, 512, 512);
  assertImage(googleFeature, 1024, 500);

  const manifestData = {
    generatedBy: "scripts/export-store-assets.cjs",
    sourceIcon: "assets/icon.png",
    sourceBanner: "assets/banner.png",
    assets: [
      {
        file: "app-store-icon-1024.png",
        width: 1024,
        height: 1024,
        alpha: false,
        target: "Apple App Store icon"
      },
      {
        file: "google-play-icon-512.png",
        width: 512,
        height: 512,
        alpha: false,
        target: "Google Play app icon"
      },
      {
        file: "google-play-feature-graphic-1024x500.png",
        width: 1024,
        height: 500,
        alpha: false,
        target: "Google Play feature graphic"
      }
    ]
  };

  fs.writeFileSync(manifest, `${JSON.stringify(manifestData, null, 2)}\n`);
  console.log(`Exported store assets to ${out}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
