import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "dev";

function hasCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: true,
  });

  return result.status === 0;
}

if (!hasCommand("rustc") || !hasCommand("cargo")) {
  console.error(
    [
      "Rust toolchain is required to run the Yinjie desktop shell.",
      "Install rustup, restart the terminal, then rerun this command.",
      "Current JS workspace has already been scaffolded and verified.",
    ].join(" "),
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "tauri", mode], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
