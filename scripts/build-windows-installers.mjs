import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const desktopDir = join(repoRoot, "apps", "desktop");
const desktopDirFromRepoRoot = ".\\apps\\desktop";
const tauriConfigPath = join(desktopDir, "src-tauri", "tauri.conf.json");
const scriptArgs = process.argv.slice(2);

if (process.platform !== "win32") {
  console.error("Windows installer packaging is only supported on Windows.");
  process.exit(1);
}

const config = resolveConfig(scriptArgs);
const selectedBundleKinds = normalizeBundles(config.bundles);

ensureCommand("pnpm", ["--version"], "pnpm is required. Install pnpm and rerun this script.");
ensureCommand("cargo", ["--version"], "Rust toolchain is required. Install rustup and rerun this script.");
ensureCommand("rustup", ["--version"], "rustup is required. Install rustup and rerun this script.");

const needsVsDevCmd = !hasCommand("cl", ["/?"]);
const vsDevCmd = needsVsDevCmd ? resolveVsDevCmd() : null;

if (needsVsDevCmd && !vsDevCmd) {
  console.error(
    [
      "MSVC Build Tools were not found.",
      "Install Visual Studio Build Tools with Desktop development with C++ and Windows SDK.",
    ].join(" "),
  );
  process.exit(1);
}

if (needsVsDevCmd) {
  console.log("Initializing MSVC environment through VsDevCmd before packaging...");
}

console.log("");
console.log("[1/2] Building Windows installer bundles...");
runTauriBuild({
  bundles: selectedBundleKinds,
  cargoTargetDir: config.cargoTargetDir,
  target: config.target,
  vsDevCmd,
});

console.log("");
console.log("[2/2] Collecting installer artifacts...");
const artifacts = collectArtifacts({
  bundles: selectedBundleKinds,
  cargoTargetDir: config.cargoTargetDir,
  outputDir: config.outputDir,
  target: config.target,
});

if (artifacts.length === 0) {
  console.error("");
  console.error("Build finished but no installer artifacts were found.");
  console.error(`Checked bundle root: ${join(config.cargoTargetDir, config.target, "release", "bundle")}`);
  process.exit(1);
}

console.log("");
console.log("Windows installers are ready:");
for (const artifact of artifacts) {
  console.log(`- ${artifact.fileName}`);
}

if (config.releaseManifestPath) {
  writeReleaseManifest({
    artifacts,
    config,
  });
  console.log(`- ${basenameWindowsPath(config.releaseManifestPath)}`);
}

console.log("");
console.log(`Output folder: ${config.outputDir}`);

function resolveConfig(args) {
  const tauriConfig = readTauriConfig();
  const bundles =
    readOption(args, "--bundles") ??
    process.env.YINJIE_WINDOWS_BUNDLES ??
    "nsis,msi";
  const target = readOption(args, "--target") ?? "x86_64-pc-windows-msvc";
  const archiveByVersion = hasFlag(args, "--archive-by-version");
  const cargoTargetDir = resolve(
    readOption(args, "--cargo-target-dir") ??
      process.env.CARGO_TARGET_DIR ??
      "C:\\cargo-target\\yinjie-desktop",
  );
  const releaseRootDir = resolve(
    readOption(args, "--release-root-dir") ?? join(repoRoot, "dist", "releases", "windows"),
  );
  const outputDir = resolve(
    readOption(args, "--output-dir") ??
      (archiveByVersion
        ? join(releaseRootDir, `${sanitizePathSegment(tauriConfig.productName)}-${tauriConfig.version}`)
        : join(repoRoot, "dist", "windows-installer")),
  );
  const releaseManifestPath = archiveByVersion ? join(outputDir, "release-manifest.json") : null;

  return {
    archiveByVersion,
    bundles,
    cargoTargetDir,
    outputDir,
    productName: tauriConfig.productName,
    releaseManifestPath,
    releaseRootDir,
    target,
    version: tauriConfig.version,
  };
}

function readOption(args, name) {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === name) {
      return args[index + 1] ?? null;
    }
    if (current.startsWith(`${name}=`)) {
      return current.slice(name.length + 1);
    }
  }

  return null;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function normalizeBundles(bundlesValue) {
  const allowed = new Set(["nsis", "msi"]);
  const bundles = bundlesValue
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (bundles.length === 0) {
    console.error("At least one Windows bundle type is required. Supported values: nsis, msi.");
    process.exit(1);
  }

  const invalid = bundles.filter((bundle) => !allowed.has(bundle));
  if (invalid.length > 0) {
    console.error(`Unsupported Windows bundle types: ${invalid.join(", ")}. Supported values: nsis, msi.`);
    process.exit(1);
  }

  return [...new Set(bundles)];
}

function hasCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: true,
    env: process.env,
  });

  return result.status === 0;
}

function ensureCommand(command, args, message) {
  if (hasCommand(command, args)) {
    return;
  }

  console.error(message);
  process.exit(1);
}

function resolveVsDevCmd() {
  const fromVsWhere = resolveVsDevCmdViaVsWhere();
  if (fromVsWhere) {
    return fromVsWhere;
  }

  const fallbacks = [
    "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\Common7\\Tools\\VsDevCmd.bat",
    "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\Tools\\VsDevCmd.bat",
    "C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat",
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\Common7\\Tools\\VsDevCmd.bat",
  ];

  return fallbacks.find((candidate) => existsSync(candidate)) ?? null;
}

function resolveVsDevCmdViaVsWhere() {
  const vsWhere = join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft Visual Studio", "Installer", "vswhere.exe");
  if (!vsWhere || !existsSync(vsWhere)) {
    return null;
  }

  const result = spawnSync(
    vsWhere,
    [
      "-latest",
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ],
    {
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  if ((result.status ?? 1) !== 0) {
    return null;
  }

  const installPath = result.stdout.trim();
  if (!installPath) {
    return null;
  }

  const vsDevCmd = join(installPath, "Common7", "Tools", "VsDevCmd.bat");
  return existsSync(vsDevCmd) ? vsDevCmd : null;
}

function runTauriBuild({ bundles, cargoTargetDir, target, vsDevCmd }) {
  const commandArgs = [
    "node",
    ".\\scripts\\run-tauri.mjs",
    "build",
    "--bundles",
    bundles.join(","),
    "--target",
    target,
  ];

  if (vsDevCmd) {
    const tempDir = mkdtempSync(join(tmpdir(), "yinjie-win-build-"));
    const tempScript = join(tempDir, "run-build.cmd");
    const scriptBody = [
      "@echo off",
      "setlocal EnableExtensions",
      `call "${vsDevCmd}" -arch=amd64 -host_arch=amd64 >nul`,
      "if errorlevel 1 exit /b 1",
      `set "CARGO_TARGET_DIR=${cargoTargetDir}"`,
      `set "YINJIE_WINDOWS_BUNDLES=${bundles.join(",")}"`,
      `cd /d "${desktopDirFromRepoRoot}"`,
      `call ${commandArgs.join(" ")}`,
      "exit /b %ERRORLEVEL%",
      "",
    ].join("\r\n");

    writeFileSync(tempScript, scriptBody, "ascii");

    try {
      const result = spawnSync("cmd.exe", ["/d", "/c", tempScript], {
        cwd: repoRoot,
        stdio: "inherit",
      });

      if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    return;
  }

  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: desktopDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CARGO_TARGET_DIR: cargoTargetDir,
      YINJIE_WINDOWS_BUNDLES: bundles.join(","),
    },
    shell: true,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function collectArtifacts({ bundles, cargoTargetDir, outputDir, target }) {
  const bundleRoot = join(cargoTargetDir, target, "release", "bundle");
  const bundleDefinitions = {
    msi: { directory: "msi", extension: ".msi" },
    nsis: { directory: "nsis", extension: ".exe" },
  };

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const copiedArtifacts = [];

  for (const bundle of bundles) {
    const definition = bundleDefinitions[bundle];
    const sourceDir = join(bundleRoot, definition.directory);
    if (!existsSync(sourceDir)) {
      continue;
    }

    const files = readdirSync(sourceDir).filter((fileName) => fileName.toLowerCase().endsWith(definition.extension));
    for (const fileName of files) {
      const sourceFile = join(sourceDir, fileName);
      const outputFile = join(outputDir, fileName);
      copyFileSync(sourceFile, outputFile);
      copiedArtifacts.push({ fileName, outputFile });
    }
  }

  return copiedArtifacts;
}

function readTauriConfig() {
  const rawConfig = readFileSync(tauriConfigPath, "utf8");
  const parsed = JSON.parse(rawConfig);
  const productName = parsed.productName?.trim();
  const version = parsed.version?.trim();

  if (!productName || !version) {
    console.error(`Missing productName/version in ${tauriConfigPath}.`);
    process.exit(1);
  }

  return {
    productName,
    version,
  };
}

function sanitizePathSegment(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "-");
}

function writeReleaseManifest({ artifacts, config }) {
  const manifest = {
    productName: config.productName,
    version: config.version,
    target: config.target,
    bundles: config.bundles.split(",").map((item) => item.trim()).filter(Boolean),
    outputDir: config.outputDir,
    generatedAt: new Date().toISOString(),
    artifacts: artifacts.map((artifact) => ({
      fileName: artifact.fileName,
      path: artifact.outputFile,
    })),
  };

  writeFileSync(config.releaseManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function basenameWindowsPath(filePath) {
  const segments = filePath.split(/[\\/]/u);
  return segments[segments.length - 1] ?? filePath;
}
