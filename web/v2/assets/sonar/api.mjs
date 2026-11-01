export async function api(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !body || body.ok === false) {
    const error = new Error(body?.error || "unavailable");
    error.status = response.status;
    throw error;
  }
  return body;
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
