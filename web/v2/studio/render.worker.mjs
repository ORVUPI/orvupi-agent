import { PNG_COMMENT } from "./lib/copy.mjs";
import { injectComment } from "./lib/png.mjs";
import { renderCard } from "./lib/render.mjs";

const avatars = new Map();
let pngGen = 0;
let previewGen = 0;
let pngTask = null;
let previewTask = null;
let pumping = false;
let board = null;
let context = null;

function surface(width, height) {
  if (!board) {
    board = new OffscreenCanvas(width, height);
    context = board.getContext("2d");
  } else if (board.width !== width || board.height !== height) {
    board.width = width;
    board.height = height;
    context = board.getContext("2d");
  }
  if (!context) context = board.getContext("2d");
  return context;
}

function resolveAvatar(options) {
  const key = options.avatarKey || "";
  if (options.avatar && key) avatars.set(key, options.avatar);
  if (options.avatar) return options.avatar;
  if (key && avatars.has(key)) return avatars.get(key);
  return null;
}

function bitmapOf(card) {
  const ctx = surface(card.width, card.height);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(card.rgba), card.width, card.height), 0, 0);
  const bitmap = board.transferToImageBitmap();
  context = null;
  return bitmap;
}

async function pngBlob(card) {
  const ctx = surface(card.width, card.height);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(card.rgba), card.width, card.height), 0, 0);
  const blob = await board.convertToBlob({ type: "image/png" });
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Blob([injectComment(bytes, PNG_COMMENT)], { type: "image/png" });
}

async function run(task, png) {
  const data = task.data;
  const alive = () => task.gen === (png ? pngGen : previewGen);
  const avatar = resolveAvatar(data.options || {});
  const card = await renderCard({
    ...data.options,
    avatar,
    png: false,
    alive,
  });
  if (!alive()) return;
  if (png) {
    const blob = await pngBlob(card);
    if (!alive() || !blob) return;
    self.postMessage({
      id: data.id,
      kind: "png",
      blob,
      fits: card.fits,
      noticeText: card.noticeText,
      label: card.label,
      width: card.width,
      height: card.height,
    });
    return;
  }
  const bitmap = bitmapOf(card);
  if (!alive()) {
    bitmap.close?.();
    return;
  }
  self.postMessage({
    id: data.id,
    kind: "preview",
    bitmap,
    fits: card.fits,
    noticeText: card.noticeText,
    label: card.label,
    width: card.width,
    height: card.height,
  }, [bitmap]);
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (pngTask || previewTask) {
      const png = Boolean(pngTask);
      const task = png ? pngTask : previewTask;
      if (png) pngTask = null;
      else previewTask = null;
      if (task.gen !== (png ? pngGen : previewGen)) continue;
      try {
        await run(task, png);
      } catch (error) {
        if (error?.name === "AbortError" || task.gen !== (png ? pngGen : previewGen)) continue;
        self.postMessage({ id: task.data.id, kind: png ? "png" : "preview", error: String(error?.message || error) });
      }
    }
  } finally {
    pumping = false;
    if (pngTask || previewTask) pump();
  }
}

function cancelAll() {
  pngGen += 1;
  previewGen += 1;
  pngTask = null;
  previewTask = null;
}

// Solo estos tres tipos. Cualquier otro mensaje se ignora.
self.onmessage = (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  switch (data.kind) {
    case "cancel":
      cancelAll();
      return;
    case "preview":
      previewGen += 1;
      previewTask = { gen: previewGen, data };
      pump();
      return;
    case "png":
      pngGen += 1;
      pngTask = { gen: pngGen, data };
      pump();
      return;
    default:
      return;
  }
};
