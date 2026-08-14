// Convert the source SVG into the macOS ICNS application icon.
// Usage: npm run icon:mac (requires macOS iconutil)
import { execFileSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "assets", "deepseek-color.svg");
const iconsetDir = path.join(root, "deepseek.iconset");
const icnsPath = path.join(root, "assets", "deepseek.icns");
const sizes = [16, 32, 128, 256, 512];

if (process.platform !== "darwin") {
  throw new Error("macOS icon generation requires iconutil.");
}

await fs.rm(iconsetDir, { recursive: true, force: true });
await fs.mkdir(iconsetDir, { recursive: true });

for (const size of sizes) {
  await sharp(svgPath).resize(size, size).png().toFile(path.join(iconsetDir, `icon_${size}x${size}.png`));
  await sharp(svgPath).resize(size * 2, size * 2).png().toFile(path.join(iconsetDir, `icon_${size}x${size}@2x.png`));
}

execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", icnsPath]);
await fs.rm(iconsetDir, { recursive: true, force: true });
console.log(`Wrote ${icnsPath}`);
