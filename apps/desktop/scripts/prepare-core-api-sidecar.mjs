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
const configuredCargoTargetDir = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : null;

if (process.platform !== "win32") {
  process.exit(0);
}

const hostTargetTriple = resolveHostTargetTriple();
const requestedTarget = readTargetArg(forwardedArgs);
const envTargetTriple = process.env.CARGO_BUILD_TARGET?.trim() || null;
const targetTriple = requestedTarget ?? envTargetTriple ?? hostTargetTriple;
const shouldPassCargoTarget = (requestedTarget ?? envTargetTriple) && targetTriple !== hostTargetTriple;
const shouldUseTargetSubdir = Boolean(requestedTarget ?? envTargetTriple);

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

const cargoArgs = ["build", "--manifest-path", "crates/core-api/Cargo.toml"];
if (shouldPassCargoTarget) {
  cargoArgs.push("--target", targetTriple);
}
if (profile === "release") {
  cargoArgs.push("--release");
}

runCargoBuildWithRetry();

const builtBinary = resolveBuiltBinaryPath({
  cargoTargetDir: configuredCargoTargetDir,
  targetTriple,
  profile,
  shouldUseTargetSubdir,
});
if (!existsSync(builtBinary)) {
  console.error(`Expected Windows Core API binary was not produced: ${builtBinary}`);
  process.exit(1);
}

mkdirSync(sidecarDir, { recursive: true });
const bundledBinary = join(sidecarDir, `yinjie-core-api-${targetTriple}.exe`);
copyFileSync(builtBinary, bundledBinary);

console.log(`Prepared Windows Core API sidecar: ${bundledBinary}`);

function runCargoBuildWithRetry() {
  const maxAttempts = mode === "build" ? 6 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const buildResult = spawnSync("cargo", cargoArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: "pipe",
      encoding: "utf8",
    });

    if (buildResult.stdout) {
      process.stdout.write(buildResult.stdout);
    }

    if (buildResult.stderr) {
      process.stderr.write(buildResult.stderr);
    }

    if ((buildResult.status ?? 1) === 0) {
      return;
    }

    const combinedOutput = `${buildResult.stdout ?? ""}\n${buildResult.stderr ?? ""}`;
    const retryableWindowsBuildScriptError =
      attempt < maxAttempts &&
      /build-script-build/i.test(combinedOutput) &&
      /os error 5/i.test(combinedOutput);

    if (!retryableWindowsBuildScriptError) {
      process.exit(buildResult.status ?? 1);
    }

    console.error(
      `Detected transient Windows Core API sidecar build failure (attempt ${attempt}/${maxAttempts}). Retrying...`,
    );
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  }

  process.exit(1);
}

function resolveBuiltBinaryPath({ cargoTargetDir, targetTriple, profile, shouldUseTargetSubdir }) {
  const targetRoot = cargoTargetDir ?? join(coreApiRoot, "target");
  if (shouldUseTargetSubdir) {
    return join(targetRoot, targetTriple, profile, "yinjie-core-api.exe");
  }

  return join(targetRoot, profile, "yinjie-core-api.exe");
}

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
