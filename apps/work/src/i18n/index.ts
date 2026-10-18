import type { WorkErrorCode } from "../security/errors";
import { en, es, type MessageKey } from "./messages";

export type Locale = "es" | "en";
export type { MessageKey };

const catalogs = { es, en };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = catalogs[locale][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ""));
}

export function errorMessageKey(code: WorkErrorCode): MessageKey {
  switch (code) {
    case "too-large":
    case "image-too-large":
      return code === "image-too-large" ? "reasonImageSize" : "reasonTooLarge";
    case "quota":
      return "reasonQuota";
    case "invalid-format":
      return "reasonInvalid";
    case "unsupported-version":
      return "reasonVersion";
    case "storage":
      return "reasonStorage";
    case "not-found":
      return "reasonMissing";
    case "corrupt-file":
      return "reasonCorrupt";
    case "unsupported-type":
      return "reasonType";
    case "image-type":
      return "reasonImageType";
    case "invalid-link":
      return "reasonLink";
    case "invalid-move":
      return "reasonMove";
    case "invalid-name":
      return "reasonInvalid";
    case "ai-unavailable":
      return "aiUnavailable";
    default:
      return "reasonGeneric";
  }
}
