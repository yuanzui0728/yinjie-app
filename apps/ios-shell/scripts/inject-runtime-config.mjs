import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "runtime-config.example.json");
const outputPath = path.resolve(process.cwd(), "../app/dist/runtime-config.json");

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing runtime config template: ${sourcePath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.copyFileSync(sourcePath, outputPath);
console.log(`Injected runtime config into ${outputPath}`);
