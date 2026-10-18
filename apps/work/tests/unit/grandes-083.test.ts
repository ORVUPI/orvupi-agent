// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES } from "../../src/security/limits";
import { safeImageSrc } from "../../src/security/sanitize";
import { MemoryBlobStore } from "../../src/storage/memory";
import { assetSrcs, externalizeImages, imageBytesSync, inlineAssets, isAssetSrc, preloadAssets, putAsset, readAsset, releaseExportAssets, setAssetStore } from "../../src/storage/assets";
import { ensureRoom } from "../../src/storage/quota";
import { importDocx } from "../../src/docs/docx-import";
import { fixture082 } from "../fixtures/docx-082";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("0.8.3 documentos grandes", () => {
  it("el límite por archivo es de al menos 250 MB", () => {
    expect(MAX_FILE_BYTES).toBeGreaterThanOrEqual(250 * 1024 * 1024);
  });

  it("acepta referencias orv-asset y rechaza otras", () => {
    expect(safeImageSrc("orv-asset:0123456789abcdef.png")).toBe("orv-asset:0123456789abcdef.png");
    expect(safeImageSrc("orv-asset:../../x.png")).toBeNull();
    expect(safeImageSrc("javascript:alert(1)")).toBeNull();
    expect(safeImageSrc(PNG)).toBe(PNG);
  });

  it("guarda la imagen aparte como binario y la recupera intacta para exportar", async () => {
    setAssetStore(new MemoryBlobStore());
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const src = await putAsset(bytes, "image/png");
    expect(isAssetSrc(src)).toBe(true);
    expect(await readAsset(src)).toEqual(bytes);
    const doc = { type: "doc", content: [{ type: "image", attrs: { src } }] };
    expect([...assetSrcs(doc)]).toEqual([src]);
    await preloadAssets(doc);
    expect(imageBytesSync(src)?.data).toEqual(bytes);
    const inlined = inlineAssets(doc);
    expect(String((inlined.content[0]!.attrs as { src: string }).src)).toMatch(/^data:image\/png;base64,/);
    releaseExportAssets();
    setAssetStore(null);
  });

  it("pasa las imágenes incrustadas a binarios guardados aparte", async () => {
    setAssetStore(new MemoryBlobStore());
    const out = await externalizeImages({ type: "doc", content: [{ type: "image", attrs: { src: PNG } }, { type: "image", attrs: { src: PNG } }] });
    const a = (out.content[0]!.attrs as { src: string }).src;
    expect(isAssetSrc(a)).toBe(true);
    expect((out.content[1]!.attrs as { src: string }).src).toBe(a);
    setAssetStore(null);
  });

  it("la importación DOCX con almacén no deja base64 en el documento", async () => {
    setAssetStore(new MemoryBlobStore());
    const result = await importDocx(fixture082());
    const json = JSON.stringify(result.content);
    expect(json).not.toContain("data:image");
    expect(json).toContain("orv-asset:");
    setAssetStore(null);
  });

  it("si no cabe en la cuota, el error dice el tamaño y el espacio libre", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "storage");
    Object.defineProperty(globalThis.navigator, "storage", { configurable: true, value: { estimate: async () => ({ quota: 100 * 1024 * 1024, usage: 90 * 1024 * 1024 }) } });
    await expect(ensureRoom(30 * 1024 * 1024)).rejects.toMatchObject({ code: "quota", vars: { size: "30 MB", free: "10 MB" } });
    await expect(ensureRoom(5 * 1024 * 1024)).resolves.toBeUndefined();
    if (original) Object.defineProperty(globalThis.navigator, "storage", original);
    else Reflect.deleteProperty(globalThis.navigator, "storage");
  });
});
