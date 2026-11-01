import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
const result = spawnSync("npm", ["run", "build", "--workspace=@alibi/web"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.status !== 0) process.exit(result.status || 1);
rmSync("out", { recursive: true, force: true });
cpSync("web/out", "out", { recursive: true });
