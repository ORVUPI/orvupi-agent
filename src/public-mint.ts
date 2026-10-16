import path from "node:path";
import { isRecord, readStrictJson, sameKeys } from "./json-file.js";

export const PREVIOUS_MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type MintLoad =
  | { ok: true; mint: string }
  | { ok: false; reason: "unreadable" | "invalid" | "mismatch" };

export function publicMintPath(root: string): string {
  return path.join(root, "state", "public-mint.json");
}

export function loadPublicMint(root: string): MintLoad {
  const read = readStrictJson(publicMintPath(root), 2048);
  if (!read.ok) {
    return { ok: false, reason: read.reason };
  }
  if (!isRecord(read.value) || !sameKeys(read.value, ["version", "mint"])) {
    return { ok: false, reason: "invalid" };
  }
  if (read.value.version !== 1 || typeof read.value.mint !== "string" || !MINT_PATTERN.test(read.value.mint)) {
    return { ok: false, reason: "invalid" };
  }
  if (read.value.mint !== PREVIOUS_MINT) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true, mint: PREVIOUS_MINT };
}
