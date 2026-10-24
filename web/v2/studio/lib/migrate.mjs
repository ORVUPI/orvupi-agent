/** Lee un borrador v1 del Studio anterior y lo convierte en un documento v2. No borra la clave antigua. */

import templates from "../templates.json" with { type: "json" };
import { FORMATS, createDocument, imageLayer, importProject, textLayer } from "./document.mjs";

export function migrateDraft(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.v === 2 && Array.isArray(data.layers)) {
    try {
      return importProject(data);
    } catch {
      return null;
    }
  }
  if (data.v !== 1) return null;
  const story = data.formatId === "story";
  const format = story ? FORMATS.story : FORMATS.square;
  const known = templates.templates.find((item) => item.id === data.templateId) || templates.templates[0];
  const title = String(data.title ?? known?.title?.es ?? "");
  const body = String(data.body ?? known?.body?.es ?? "");
  const zones = templates.zones;
  const width = format.width;
  const height = format.height;
  const layers = [
    textLayer({
      name: "Titular",
      x: zones.title.x * width,
      y: zones.title.y * height,
      w: zones.title.w * width,
      h: zones.title.h * height,
      z: 20,
      text: title,
      fontId: "anton",
      size: story ? 72 : 64,
      color: "#FFF8EC",
      align: "left",
    }),
    textLayer({
      name: "Cuerpo",
      x: zones.body.x * width,
      y: zones.body.y * height,
      w: zones.body.w * width,
      h: zones.body.h * height,
      z: 30,
      text: body,
      fontId: "barlow",
      size: 36,
      color: "#FFF8EC",
      align: "left",
    }),
  ];
  if (data.avatarId) {
    layers.push(imageLayer({
      name: "Personaje",
      x: zones.avatar.x * width,
      y: zones.avatar.y * height,
      w: zones.avatar.w * width,
      h: zones.avatar.h * height,
      z: 10,
      src: { kind: "catalog", id: String(data.avatarId) },
    }));
  }
  return createDocument({
    name: known?.nombre?.es || "Diseño anterior",
    format,
    templateId: `legacy-${known?.id || "placa"}`,
    background: {
      type: data.fondoId ? "catalog" : "solid",
      catalogId: data.fondoId ? String(data.fondoId) : "",
      fill: "#102032",
    },
    layers,
    meta: {
      locale: "es",
      useTags: ["anterior"],
      optionalLabel: String(data.token || "").slice(0, 40),
    },
  });
}
