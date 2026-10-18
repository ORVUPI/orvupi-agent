import { describe, expect, test } from "vitest";
import { SaveController, createSaveQueue } from "../../src/docs/save-status";

describe("indicador de guardado", () => {
  test("solo está guardado cuando la escritura terminó y no hay cambios nuevos", () => {
    const controller = new SaveController();
    controller.reset("a");
    expect(controller.status()).toBe("saved");
    controller.noteChange("b");
    expect(controller.status()).toBe("pending");
    const token = controller.beginSave();
    expect(controller.status()).toBe("pending");
    controller.finishSave(token, "b");
    expect(controller.status()).toBe("saved");
  });

  test("una respuesta antigua no pisa un guardado más nuevo", () => {
    const controller = new SaveController();
    controller.reset("a");
    controller.noteChange("b");
    const first = controller.beginSave();
    controller.noteChange("c");
    const second = controller.beginSave();
    controller.finishSave(first, "b");
    expect(controller.status()).toBe("pending");
    controller.finishSave(second, "c");
    expect(controller.status()).toBe("saved");
  });

  test("un fallo deja el documento como cambios pendientes", async () => {
    const controller = new SaveController();
    controller.reset("a");
    const queue = createSaveQueue(
      controller,
      async () => {
        throw new Error("disco");
      },
      () => undefined,
    );
    queue.note("b");
    await expect(queue.flush()).rejects.toThrow("disco");
    expect(controller.status()).toBe("pending");
  });

  test("flush escribe el último texto", async () => {
    const controller = new SaveController();
    controller.reset("a");
    const written: string[] = [];
    const queue = createSaveQueue(
      controller,
      async (snapshot) => {
        written.push(snapshot);
      },
      () => undefined,
    );
    queue.note("b");
    queue.note("c");
    await queue.flush();
    expect(written.at(-1)).toBe("c");
    expect(controller.status()).toBe("saved");
  });
});
