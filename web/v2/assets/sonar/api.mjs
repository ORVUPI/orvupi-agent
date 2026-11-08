import { publicSonar } from "./public-fallback.mjs?v=cf7b7e0296";

export async function api(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const type = response.headers.get("content-type") || "";
  let body = null;
  if (type.includes("json")) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (response.ok && body && body.ok !== false) return body;
  if (response.status === 404 || !type.includes("json")) {
    const fallback = await publicSonar(path);
    if (fallback) return fallback;
  }
  const error = new Error(body?.error || "unavailable");
  error.status = response.status;
  throw error;
}

export function qs(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
