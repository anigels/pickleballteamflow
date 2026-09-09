import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const outputDir = join(rootDir, "www");

mkdirSync(outputDir, { recursive: true });

const staticFiles = ["manifest.json", "service-worker.js", "pickball_court.jpg"];

for (const fileName of staticFiles) {
  copyFileSync(join(rootDir, fileName), join(outputDir, fileName));
}

const iconFiles = readdirSync(rootDir).filter(
  (name) => name.startsWith("icon-") && name.endsWith(".png")
);

for (const fileName of iconFiles) {
  copyFileSync(join(rootDir, fileName), join(outputDir, fileName));
}

console.log(`Copied ${staticFiles.length + iconFiles.length} files to www/.`);
