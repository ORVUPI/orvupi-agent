import { access, constants, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFERRED = "/opt/cursor/artifacts/screenshots";

let resolved: string | null = null;

/** Carpeta de las capturas de Playwright.
 *  ORVUPI_SCREENSHOTS elige la ruta. Si no está, se usa la carpeta de
 *  artefactos cuando se puede crear y escribir. Si no, una carpeta temporal.
 */
export async function screenshotDir(): Promise<string> {
  if (resolved) return resolved;
  const requested = process.env.ORVUPI_SCREENSHOTS?.trim();
  const dir = requested || PREFERRED;
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
    resolved = dir;
    return dir;
  } catch (error) {
    if (requested) throw error;
    const fallback = join(tmpdir(), "orvupi-work-screenshots");
    await mkdir(fallback, { recursive: true });
    resolved = fallback;
    return fallback;
  }
}
