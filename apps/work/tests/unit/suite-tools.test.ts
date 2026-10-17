import { describe, expect, test } from "vitest";
import { parseDrawing, serializeDrawing } from "../../src/drawings/model";
import { createFormFile, missingRequired, parseForm, serializeForm } from "../../src/forms/model";
import { createNoteFile, parseNote, serializeNote } from "../../src/notes/model";

describe("formularios, dibujos y notas", () => {
  test("un formulario guarda preguntas y respuestas", () => {
    const file = createFormFile({ id: "f1", title: "Encuesta" });
    file.questions = [{ id: "q1", prompt: "Nombre", kind: "short", required: true, options: [] }];
    file.responses = [{ id: "r1", at: "2026-10-17", answers: { q1: "Ada" } }];
    const again = parseForm(serializeForm(file));
    expect(again.title).toBe("Encuesta");
    expect(again.responses[0]?.answers.q1).toBe("Ada");
    expect(missingRequired(again, {})).toBe(true);
    expect(missingRequired(again, { q1: "Ada" })).toBe(false);
  });

  test("un dibujo conserva un rectángulo", () => {
    const again = parseDrawing(serializeDrawing({
      format: "orvupi-drawing",
      version: 1,
      id: "d1",
      title: "Boceto",
      items: [{ id: "s1", kind: "shape", shape: "rect", x: 10, y: 20, w: 80, h: 40, fill: "#1d4e89" }],
    }));
    expect(again.items[0]).toMatchObject({ kind: "shape", fill: "#1d4e89" });
  });

  test("una nota fija el color de la paleta", () => {
    const note = createNoteFile({ id: "n1", title: "Lista" });
    note.pinned = true;
    note.color = "#102032";
    note.checks = [{ id: "c1", text: "Leche", done: false }];
    const again = parseNote(serializeNote(note));
    expect(again.pinned).toBe(true);
    expect(again.color).toBe("#102032");
    expect(again.checks[0]?.text).toBe("Leche");
  });
});