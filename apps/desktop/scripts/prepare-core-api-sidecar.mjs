import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const desktopRoot = resolve(__dirname, "..");
const coreApiRoot = resolve(repoRoot, "crates/core-api");
const sidecarDir = resolve(desktopRoot, "src-tauri/binaries");
const mode = process.argv[2] ?? "build";
const forwardedArgs = process.argv.slice(3);
const profile = mode === "dev" ? "debug" : "release";

if (process.platform !== "win32") {
  process.exit(0);
}

const targetTriple = readTargetArg(forwardedArgs) ?? resolveHostTargetTriple();

if (!targetTriple) {
  console.error("Could not determine the Rust host target triple.");
  process.exit(1);
}

if (!targetTriple.includes("windows")) {
  console.error(
    `The desktop sidecar preparation script expected a Windows target, got ${targetTriple}.`,
  );
  process.exit(1);
}

const cargoArgs = ["build", "--manifest-path", "crates/core-api/Cargo.toml", "--target", targetTriple];
if (profile === "release") {
  cargoArgs.push("--release");
}

const buildResult = spawnSync("cargo", cargoArgs, {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

if ((buildResult.status ?? 1) !== 0) {
  process.exit(buildResult.status ?? 1);
}

const builtBinary = join(coreApiRoot, "target", targetTriple, profile, "yinjie-core-api.exe");
if (!existsSync(builtBinary)) {
  console.error(`Expected Windows Core API binary was not produced: ${builtBinary}`);
  process.exit(1);
}

mkdirSync(sidecarDir, { recursive: true });
const bundledBinary = join(sidecarDir, `yinjie-core-api-${targetTriple}.exe`);
copyFileSync(builtBinary, bundledBinary);

console.log(`Prepared Windows Core API sidecar: ${bundledBinary}`);

function resolveHostTargetTriple() {
  const rustcVersion = spawnSync("rustc", ["-vV"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });

  if ((rustcVersion.status ?? 1) !== 0) {
    console.error("Failed to inspect the Rust host target for the desktop sidecar.");
    process.exit(rustcVersion.status ?? 1);
  }

  const hostLine = rustcVersion.stdout
    .split(/\r?\n/u)
    .find((line) => line.startsWith("host:"));
  return hostLine?.split(":")[1]?.trim() ?? null;
}

function readTargetArg(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target") {
      return args[index + 1] ?? null;
    }
    if (arg.startsWith("--target=")) {
      return arg.slice("--target=".length);
    }
  }

  return null;
}
