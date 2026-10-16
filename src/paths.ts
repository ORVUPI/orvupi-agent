import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function repoRootFrom(moduleUrl: string): string {
  let dir = path.dirname(fileURLToPath(moduleUrl));
  for (let i = 0; i < 8; i += 1) {
    if (
      existsSync(path.join(dir, "package.json")) &&
      existsSync(path.join(dir, "policy", "limits.json")) &&
      existsSync(path.join(dir, "state", "killswitch.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error("Cannot find the orvupi-agent package root.");
}

export function repoRoot(): string {
  return repoRootFrom(import.meta.url);
}
