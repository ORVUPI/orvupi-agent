import { describe, expect, it, vi } from "vitest";
import { CHUNK_BYTES, ModelDownloadError, modelWeightsKey, robustFetch, storageKey } from "../../src/ai/download";
import { CONTENT_SECURITY_POLICY } from "../../src/security/csp";
import { AI_MODELS, recommendedModel } from "../../src/ai/engine";

const C = 1024;
const URL_MODEL = "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/resolve/main/onnx/model_quantized.onnx";

function server(size: number, opts: { failEvery?: number; status?: number } = {}) {
  const data = new Uint8Array(size).map((_, i) => i % 251);
  let calls = 0;
  const impl = vi.fn(async (_url: string, init?: RequestInit) => {
    calls += 1;
    if (opts.status) return new Response("", { status: opts.status });
    if (opts.failEvery && calls % opts.failEvery === 0) throw new TypeError("network error");
    const m = /bytes=(\d+)-(\d*)/.exec(new Headers(init?.headers).get("range") ?? "")!;
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    return new Response(data.slice(start, end + 1), { status: 206, headers: { "content-range": `bytes ${start}-${end}/${size}` } });
  });
  return { data, impl: impl as unknown as typeof fetch, calls: () => calls };
}

describe("ORVUPI AI: descarga por partes", () => {
  it("partes de 8 MB por defecto", () => expect(CHUNK_BYTES).toBe(8 * 1024 * 1024));
  it("descarga en partes, con progreso, y reconstruye el archivo exacto", async () => {
    const size = C * 2 + 123;
    const s = server(size);
    const seen: number[] = [];
    const res = await robustFetch(URL_MODEL, (_f, loaded) => seen.push(loaded), s.impl, C);
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body.length).toBe(size);
    expect(Buffer.compare(body, s.data)).toBe(0);
    expect(s.calls()).toBe(3);
    expect(seen.at(-1)).toBe(size);
  });

  it("reintenta las partes cuando la conexión se corta (el «network error» del móvil)", async () => {
    const size = C * 3;
    const s = server(size, { failEvery: 3 });
    const res = await robustFetch(URL_MODEL, () => undefined, s.impl, C);
    expect(Buffer.compare(new Uint8Array(await res.arrayBuffer()), s.data)).toBe(0);
  }, 60_000);

  it("explica los errores HTTP sin reintentar en bucle", async () => {
    const s = server(10, { status: 404 });
    await expect(robustFetch(URL_MODEL, () => undefined, s.impl)).rejects.toMatchObject({ kind: "http" });
    await expect(robustFetch(URL_MODEL, () => undefined, s.impl)).rejects.toBeInstanceOf(ModelDownloadError);
  });

  it("claves estables por repo y archivo", () => {
    expect(storageKey(URL_MODEL)).toBe("HuggingFaceTB__SmolLM2-135M-Instruct__onnx__model_quantized.onnx");
    expect(modelWeightsKey("HuggingFaceTB/SmolLM2-135M-Instruct", "q8")).toBe(storageKey(URL_MODEL));
  });

  it("en el móvil recomienda un modelo ligero: LFM2 con WebGPU, SmolLM2 por WASM sin GPU o con poca memoria", () => {
    const m = recommendedModel({ webgpu: true, f16: true, wasm: true, memoryGb: 8, mobile: true });
    expect(m?.id).toBe("lfm350-gpu");
    expect(m!.sizeMb).toBeLessThan(400);
    const lightest = [...AI_MODELS].sort((a, b) => a.sizeMb - b.sizeMb)[0]!;
    expect(recommendedModel({ webgpu: false, f16: false, wasm: true, memoryGb: 4, mobile: true })?.id).toBe(lightest.id);
    expect(recommendedModel({ webgpu: true, f16: true, wasm: true, memoryGb: 2, mobile: true })?.id).toBe(lightest.id);
    expect(modelWeightsKey("onnx-community/LFM2-350M-ONNX", "q4", true)).toBe(storageKey("https://huggingface.co/onnx-community/LFM2-350M-ONNX/resolve/main/onnx/model_q4.onnx_data"));
    expect(recommendedModel({ webgpu: true, f16: true, wasm: true, memoryGb: 8, mobile: false })?.id).toBe("qwen05-gpu");
  });

  it("la CSP permite el Hub y sus CDN de descarga (redirecciones de Xet/LFS)", () => {
    const connect = CONTENT_SECURITY_POLICY.split("; ").find((d) => d.startsWith("connect-src"))!;
    for (const host of ["huggingface.co", "cdn-lfs.huggingface.co", "cas-bridge.xethub.hf.co", "us.aws.cdn.hf.co", "cdn-lfs-us-1.hf.co", "cdn.jsdelivr.net"]) {
      const ok = connect.split(" ").some((src) => src === `https://${host}` || (src.startsWith("https://*.") && host.endsWith(src.slice("https://*".length))));
      expect(ok, host).toBe(true);
    }
  });
});
