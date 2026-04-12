import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceDir = resolve(currentDir, "..");
const appDir = resolve(workspaceDir, "apps/app");

const result = spawnSync("pnpm", ["--dir", appDir, "build"], {
  cwd: workspaceDir,
  stdio: "inherit",
  env: {
    ...process.env,
    YINJIE_APP_BUILD_BASE: "relative",
  },
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

throw result.error ?? new Error("Failed to build mobile shell web bundle.");
