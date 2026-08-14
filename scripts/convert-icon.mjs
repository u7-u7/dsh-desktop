// Convert assets/deepseek-color.svg into assets/deepseek.ico (multi-size)
// Usage: node scripts/convert-icon.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "assets", "deepseek-color.svg");
const icoPath = path.join(root, "assets", "deepseek.ico");
const tmpDir = path.join(root, ".icon-tmp");

const sizes = [256, 128, 64, 48, 32, 16];

await fs.mkdir(tmpDir, { recursive: true });

// 1. Render SVG to PNG at each size
const pngBuffers = [];
for (const size of sizes) {
  const buf = await sharp(svgPath).resize(size, size).png().toBuffer();
  pngBuffers.push(buf);
  await fs.writeFile(path.join(tmpDir, `${size}.png`), buf);
  console.log(`rendered ${size}x${size}`);
}

// 2. Pack PNGs into a single ICO
const ico = await pngToIco(pngBuffers);
await fs.writeFile(icoPath, ico);
console.log(`Wrote ${icoPath} (${ico.length} bytes)`);

// 3. Cleanup
await fs.rm(tmpDir, { recursive: true, force: true });
console.log("done");
