/** Vista previa de ARQIVEN en Cloudflare Pages. No publica orvupi.com.
 * Lee CLOUDFLARE_API_TOKEN (o CF_API_TOKEN) y CLOUDFLARE_ACCOUNT_ID del entorno.
 * No los imprime ni los pone en los argumentos.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "";
const account = process.env.CLOUDFLARE_ACCOUNT_ID || "";

if (!token || !account) {
  console.error("Faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID. No se llama a Cloudflare.");
  process.exit(2);
}

const child = spawn(
  "npx",
  ["--yes", "wrangler@4.86.0", "pages", "deploy", "web/v2", "--project-name", "orvupi-academy-preview", "--branch", "arqiven-app", "--commit-dirty=true"],
  { cwd: repo, env: process.env, stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
