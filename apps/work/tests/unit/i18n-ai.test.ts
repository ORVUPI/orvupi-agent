import { describe, expect, test } from "vitest";
import { classifyDevice } from "../../src/ai/capabilities";
import { NoModelProvider } from "../../src/ai/capabilities";
import { en, es } from "../../src/i18n/messages";

describe("idioma y capacidades", () => {
  test("español e inglés tienen las mismas claves", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const key of Object.keys(es)) {
      expect(es[key as keyof typeof es].trim().length).toBeGreaterThan(0);
      expect(en[key as keyof typeof en].trim().length).toBeGreaterThan(0);
    }
  });

  test("sin WebGPU la suite no queda bloqueada: el modelo simplemente no está", () => {
    expect(classifyDevice({ webgpu: false, deviceMemory: 16 })).toBe("unsupported");
    expect(classifyDevice({ webgpu: true, deviceMemory: 8 })).toBe("high");
    expect(classifyDevice({ webgpu: true, deviceMemory: 4 })).toBe("medium");
    expect(new NoModelProvider().status()).toBe("unavailable");
  });
});
