// One-off icon rasterizer. Not part of the build or runtime -- run with
// `node scripts/generate-icons.mjs` after `npm install sharp` locally
// whenever icon-source.svg/icon-maskable-source.svg change, then icons
// can be committed as static PNGs (sharp itself is not a project dependency).
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");

const anySvg = readFileSync(join(iconsDir, "icon-source.svg"));
const maskableSvg = readFileSync(join(iconsDir, "icon-maskable-source.svg"));

const anySizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];
const maskableSizes = [192, 512];

async function run() {
  for (const size of anySizes) {
    await sharp(anySvg).resize(size, size).png().toFile(join(iconsDir, `icon-${size}.png`));
  }
  for (const size of maskableSizes) {
    await sharp(maskableSvg).resize(size, size).png().toFile(join(iconsDir, `icon-maskable-${size}.png`));
  }
  // Apple touch icon (iOS "Add to Home Screen") -- no transparency, 180x180.
  await sharp(anySvg).resize(180, 180).flatten({ background: "#111114" }).png().toFile(join(iconsDir, "apple-touch-icon.png"));
  console.log("Icons generated.");
}

run();
