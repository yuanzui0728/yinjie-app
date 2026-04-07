# Windows One-Click Installer

## Usage

From the repo root, double-click:

```bat
build-windows-installer.bat
```

Or run:

```powershell
pnpm desktop:installer:windows
```

If you want a release archive directory with the current app version in the path, run:

```powershell
pnpm desktop:release:windows
```

If you only want the end-user `.exe` installer, run:

```powershell
pnpm desktop:installer:windows:exe
```

If you only want the enterprise `.msi` installer, run:

```powershell
pnpm desktop:installer:windows:msi
```

Release-mode variants:

```powershell
pnpm desktop:release:windows:exe
pnpm desktop:release:windows:msi
```

## What It Does

All entrypoints now route to the same script:

```text
scripts/build-windows-installers.mjs
```

That script:

1. Checks `pnpm`, `cargo`, and `rustup`
2. Detects MSVC and initializes `VsDevCmd.bat` when `cl` is not already on `PATH`
3. Calls `apps/desktop/scripts/run-tauri.mjs build`
4. Collects generated `.msi` and `.exe` installers into `dist/windows-installer/`

Supported options:

```text
--bundles nsis,msi
--target x86_64-pc-windows-msvc
--cargo-target-dir C:\cargo-target\yinjie-desktop
--output-dir <absolute-or-relative-path>
--archive-by-version
--release-root-dir <absolute-or-relative-path>
```

Supported environment variables:

```text
CARGO_TARGET_DIR
YINJIE_WINDOWS_BUNDLES
```

## Release Archive Output

`pnpm desktop:release:windows` reads `productName` and `version` from:

```text
apps/desktop/src-tauri/tauri.conf.json
```

Then it writes installers to:

```text
dist/releases/windows/<productName>-<version>/
```

It also writes:

```text
release-manifest.json
```

That manifest records the version, target, generated time, and final artifact paths for the release.

## Output

Expected installer artifacts are copied to:

```text
dist/windows-installer/
```

Default output:

- `Yinjie_0.1.0_x64-setup.exe`
- `Yinjie_0.1.0_x64_en-US.msi`
