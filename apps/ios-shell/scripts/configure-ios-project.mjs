import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const iosRoot = path.join(cwd, "ios", "App");
const appRoot = path.join(iosRoot, "App");
const pluginsRoot = path.join(appRoot, "Plugins");

if (!fs.existsSync(iosRoot)) {
  console.error("Missing ios/App directory. Run `pnpm ios:sync` first.");
  process.exit(1);
}

fs.mkdirSync(appRoot, { recursive: true });
fs.mkdirSync(pluginsRoot, { recursive: true });

const copies = [
  {
    from: path.join(cwd, "xcode-template", "Info.plist.example"),
    to: path.join(appRoot, "Info.plist.example"),
    overwrite: true,
  },
  {
    from: path.join(cwd, "xcode-template", "PrivacyInfo.xcprivacy.example"),
    to: path.join(appRoot, "PrivacyInfo.xcprivacy.example"),
    overwrite: true,
  },
  {
    from: path.join(cwd, "xcode-template", "App.entitlements.example"),
    to: path.join(appRoot, "App.entitlements.example"),
    overwrite: true,
  },
  {
    from: path.join(cwd, "xcode-template", "AppDelegatePush.example.swift"),
    to: path.join(appRoot, "AppDelegatePush.example.swift"),
    overwrite: true,
  },
  {
    from: path.join(cwd, "xcode-template", "Podfile.example"),
    to: path.join(iosRoot, "Podfile.example"),
    overwrite: true,
  },
  {
    from: path.join(cwd, "plugins", "swift-stub", "YinjieRuntimePlugin.swift"),
    to: path.join(pluginsRoot, "YinjieRuntimePlugin.swift"),
    overwrite: false,
  },
  {
    from: path.join(cwd, "plugins", "swift-stub", "YinjieSecureStoragePlugin.swift"),
    to: path.join(pluginsRoot, "YinjieSecureStoragePlugin.swift"),
    overwrite: false,
  },
  {
    from: path.join(cwd, "plugins", "swift-stub", "YinjieMobileBridgePlugin.swift"),
    to: path.join(pluginsRoot, "YinjieMobileBridgePlugin.swift"),
    overwrite: false,
  },
];

function copyFile({ from, to, overwrite }) {
  fs.mkdirSync(path.dirname(to), { recursive: true });

  if (!overwrite && fs.existsSync(to)) {
    console.log(`kept ${path.relative(cwd, to)}`);
    return;
  }

  fs.copyFileSync(from, to);
  console.log(`copied ${path.relative(cwd, from)} -> ${path.relative(cwd, to)}`);
}

for (const file of copies) {
  copyFile(file);
}

const readmePath = path.join(pluginsRoot, "README.generated.txt");
fs.writeFileSync(
  readmePath,
  [
    "These files were copied from apps/ios-shell templates.",
    "Plugin files are only seeded when missing so existing implementations are not overwritten.",
    "Use docs/ios-plugin-implementation-guide.md and docs/ios-xcode-integration-checklist.md as the source of truth.",
    "",
  ].join("\n"),
);

console.log("");
console.log("iOS project templates copied.");
console.log("Next:");
console.log("1. Open Xcode.");
console.log("2. Add copied files to target membership.");
console.log("3. Replace any seeded plugin stubs with real implementations when needed.");
