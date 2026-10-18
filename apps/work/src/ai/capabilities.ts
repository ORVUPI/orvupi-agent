export type DeviceTier = "high" | "medium" | "unsupported";

export type CapabilitySnapshot = {
  webgpu: boolean;
  deviceMemory: number | null;
  browser: string;
  tier: DeviceTier;
};

export function classifyDevice(input: { webgpu: boolean; deviceMemory: number | null }): DeviceTier {
  if (!input.webgpu) return "unsupported";
  if ((input.deviceMemory ?? 4) >= 8) return "high";
  return "medium";
}

export function browserName(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome|chromium/i.test(userAgent)) return "Chrome";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Navegador";
}

export function detectCapabilities(): CapabilitySnapshot {
  const nav = typeof navigator === "undefined" ? null : navigator;
  const webgpu = Boolean(nav && "gpu" in nav);
  const memory = nav && "deviceMemory" in nav && typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  return {
    webgpu,
    deviceMemory: memory,
    browser: browserName(nav?.userAgent ?? ""),
    tier: classifyDevice({ webgpu, deviceMemory: memory }),
  };
}

export interface AIProvider {
  readonly id: "none";
  status(): "unavailable";
}

export class NoModelProvider implements AIProvider {
  readonly id = "none" as const;

  status(): "unavailable" {
    return "unavailable";
  }
}
