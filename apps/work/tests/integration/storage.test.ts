import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import { documentNode, paragraph } from "../../src/docs/model";
import { createOrvdoc, parseOrvdoc, serializeOrvdoc } from "../../src/docs/orvdoc";
import { WorkError } from "../../src/security/errors";
import { createId } from "../../src/security/names";
import { MemoryBlobStore } from "../../src/storage/memory";
import { createOpfsBlobStore } from "../../src/storage/opfs";
import { openStorage } from "../../src/storage/service";

async function workspace() {
  return openStorage(`orvupi-test-${createId()}`, new MemoryBlobStore());
}

describe("almacenamiento", () => {
  test("guardar, cerrar y recuperar un documento", async () => {
    const storage = await workspace();
    const id = createId();
    const file = createOrvdoc({ id, title: "Informe", content: documentNode([paragraph("Texto estable")]) });
    await storage.saveFile({
      id,
      name: "Informe",
      kind: "doc",
      mime: "application/vnd.orvupi.doc+json",
      bytes: serializeOrvdoc(file),
    });
    const loaded = await storage.loadFile(id);
    expect(loaded.integrity).toBe("ok");
    expect(parseOrvdoc(loaded.bytes).title).toBe("Informe");
    expect(docText(loaded.bytes)).toContain("Texto estable");
  });

  test("renombrar, papelera, restaurar y purgar", async () => {
    const storage = await workspace();
    const saved = await storage.saveFile({
      name: "Nota",
      kind: "doc",
      mime: "application/json",
      bytes: serializeOrvdoc(createOrvdoc({ id: createId(), title: "Nota" })),
    });
    const renamed = await storage.renameFile(saved.id, "Nota final");
    expect(renamed.name).toBe("Nota final");
    await storage.deleteFile(saved.id);
    expect(await storage.listFiles()).toHaveLength(0);
    expect(await storage.listFiles({ includeDeleted: true })).toHaveLength(1);
    await storage.restoreFile(saved.id);
    expect(await storage.listFiles()).toHaveLength(1);
    await storage.purgeFile(saved.id);
    expect(await storage.listFiles({ includeDeleted: true })).toHaveLength(0);
  });

  test("la copia se restaura y un archivo corrupto no se aplica", async () => {
    const storage = await workspace();
    await storage.saveSettings({ locale: "en" });
    await storage.saveFile({
      name: "Carta",
      kind: "doc",
      mime: "application/json",
      bytes: serializeOrvdoc(createOrvdoc({ id: createId(), title: "Carta", content: documentNode([paragraph("Hola")]) })),
    });
    const backup = await storage.backupWorkspace();
    await storage.restoreWorkspace(backup);
    const files = await storage.listFiles();
    expect(files).toHaveLength(1);
    expect((await storage.getSettings()).locale).toBe("en");
    const again = await storage.loadFile(files[0]?.id ?? "");
    expect(parseOrvdoc(again.bytes).title).toBe("Carta");
    await expect(storage.restoreWorkspace(new TextEncoder().encode("{"))).rejects.toBeInstanceOf(WorkError);
    await expect(storage.restoreWorkspace(new TextEncoder().encode(JSON.stringify({ format: "otro", version: 1 })))).rejects.toMatchObject({ code: "invalid-format" });
  });

  test("un byte cambiado se detecta y no se presenta como íntegro", async () => {
    const blobs = new MemoryBlobStore();
    const storage = await openStorage(`orvupi-test-${createId()}`, blobs);
    const saved = await storage.saveFile({
      name: "Dato",
      kind: "other",
      mime: "text/plain",
      bytes: new TextEncoder().encode("original"),
    });
    await blobs.write(saved.blobKey, new TextEncoder().encode("tocado"));
    const loaded = await storage.loadFile(saved.id);
    expect(loaded.integrity).toBe("mismatch");
  });

  test("en Node no hay OPFS y el servicio sigue pudiendo abrirse", async () => {
    expect(await createOpfsBlobStore()).toBeNull();
  });
});

function docText(bytes: Uint8Array): string {
  return JSON.stringify(parseOrvdoc(bytes).content);
}
