#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?version is required}"
EXPECTED_TAG="${2:?expected tag is required}"
TARGETS_JSON="${3:?targets json is required}"
OUTPUT_PATH="${4:?output path is required}"

python - <<'PY' "$VERSION" "$EXPECTED_TAG" "$TARGETS_JSON" "$OUTPUT_PATH"
import json
import sys
from pathlib import Path

version, expected_tag, targets_json, output_path = sys.argv[1:]
targets = json.loads(targets_json)

target_lines = []
for target in targets:
    label = "Apple Silicon" if target == "aarch64-apple-darwin" else "Intel"
    target_lines.append(f"- {label}: `yinjie-desktop-{version}-{target}`")

text = "\n".join(
    [
        f"# Yinjie Desktop macOS {version}",
        "",
        f"- release tag: `{expected_tag}`",
        "- this release packages the desktop shell together with the bundled `yinjie-core-api` runtime",
        "- first launch enters `/setup` and checks local Core API, runtime data, and provider state",
        "",
        "## Downloads",
        "",
        *target_lines,
        f"- diagnostics bundle: `yinjie-desktop-diagnostics-{version}-<target>`",
        f"- release manifest: `yinjie-desktop-release-manifest-{version}`",
        "",
        "## Install",
        "",
        "1. Download the DMG for your Mac architecture.",
        "2. Drag `Yinjie.app` into `Applications`.",
        "3. Open the app and wait for the local runtime check to complete.",
        "",
        "## If Startup Fails",
        "",
        "- Open `/setup` and check the desktop diagnostics card.",
        "- Confirm `commandSource` is `bundled` or `bundled-sidecar`.",
        "- Confirm `managedByDesktopShell` is `true` after retry.",
        "- Check `desktopLogPath` for the local shell log path.",
        "",
        "## Validation",
        "",
        "- `codesign --verify --deep --strict /Applications/Yinjie.app`",
        "- `spctl --assess --type execute /Applications/Yinjie.app`",
        "",
        "See the release manifest and diagnostics artifact for full target-specific details.",
    ]
)

Path(output_path).write_text(text + "\n", encoding="utf-8")
PY
