import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, Selection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { safeImageSrc } from "../security/sanitize";

/** Imágenes pegadas o arrastradas: capturas (image/png), «Copiar imagen» del navegador y HTML con <img>. */

const TYPES = /^image\/(png|jpeg|gif|webp)$/;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const TARGET_BYTES = 900 * 1024;
const MAX_SIDE = 2000;

export type PreparedImage = { src: string; width: number; height: number; alt: string };

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode"));
    image.src = src;
  });
}

/** Lee la imagen y, si es grande, la reduce para que quepa en el almacenamiento local. */
export async function prepareImage(blob: Blob, alt = ""): Promise<PreparedImage | null> {
  if (!TYPES.test(blob.type) || blob.size <= 0 || blob.size > MAX_INPUT_BYTES) return null;
  let src = await readAsDataUrl(blob);
  let width = 0;
  let height = 0;
  try {
    const image = await loadImage(src);
    width = image.naturalWidth;
    height = image.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height || 1));
    if ((blob.size > TARGET_BYTES || scale < 1) && blob.type !== "image/gif") {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let next = canvas.toDataURL("image/png");
        if (next.length * 0.75 > TARGET_BYTES) {
          context.globalCompositeOperation = "destination-over";
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          next = canvas.toDataURL("image/jpeg", 0.86);
        }
        if (next.length < src.length || scale < 1) {
          src = next;
          width = canvas.width;
          height = canvas.height;
        }
      }
    }
  } catch {
    // Sin decodificador (tests): se usa tal cual.
  }
  const safe = safeImageSrc(src);
  if (!safe) return null;
  return { src: safe, width, height, alt: alt.slice(0, 180) };
}

/** Tamaño en pantalla: como mucho el ancho útil de la página. */
export function imageAttrs(image: PreparedImage, maxWidth = 602): Record<string, unknown> {
  const attrs: Record<string, unknown> = { src: image.src, alt: image.alt };
  if (image.width > 0 && image.height > 0) {
    const scale = Math.min(1, maxWidth / image.width);
    attrs.width = Math.round(image.width * scale);
    attrs.height = Math.round(image.height * scale);
  }
  return attrs;
}

export function imageFilesOf(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  for (const file of Array.from(data.files ?? [])) if (TYPES.test(file.type)) files.push(file);
  if (files.length === 0) {
    for (const item of Array.from(data.items ?? [])) {
      if (item.kind !== "file" || !TYPES.test(item.type)) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

/** <img src="data:..."> dentro del HTML pegado (las URL remotas no se pueden descargar por la CSP). */
export function htmlImages(html: string): { data: string[]; remote: number } {
  const data: string[] = [];
  let remote = 0;
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const src = (match[2] ?? match[3] ?? "").replace(/&amp;/g, "&");
    if (safeImageSrc(src)) data.push(src);
    else if (/^(https?:|blob:)/i.test(src)) remote += 1;
  }
  return { data, remote };
}

export async function insertImages(view: EditorView, blobs: Blob[], pos?: number): Promise<number> {
  let inserted = 0;
  let at = pos;
  for (const blob of blobs) {
    const image = await prepareImage(blob, blob instanceof File ? blob.name : "");
    if (!image) continue;
    const node = view.state.schema.nodes.image?.create(imageAttrs(image));
    if (!node) continue;
    const { state } = view;
    let tr = state.tr;
    let end: number;
    if (at !== undefined || state.selection instanceof NodeSelection) {
      const where = Math.min(at ?? state.selection.to, state.doc.content.size);
      tr = tr.insert(where, node);
      end = where + node.nodeSize;
    } else {
      tr = tr.replaceSelectionWith(node);
      end = tr.mapping.map(state.selection.to);
    }
    // El cursor queda detrás de la imagen para seguir escribiendo o pegar otra.
    tr = tr.setSelection(Selection.near(tr.doc.resolve(Math.min(end, tr.doc.content.size)), 1));
    view.dispatch(tr.scrollIntoView());
    if (at !== undefined) at = end;
    inserted += 1;
  }
  return inserted;
}

function dataUrlBlob(src: string): Blob {
  const [head, body = ""] = src.split(",");
  const mime = /data:([^;]+)/.exec(head ?? "")?.[1] ?? "image/png";
  const binary = atob(body.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export const imagePasteKey = new PluginKey("ow-image-paste");

export const ImagePaste = Extension.create({
  name: "imagePaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    const notify = (kind: "remote" | "error") => {
      editor.view.dom.dispatchEvent(new CustomEvent("ow-image-note", { bubbles: true, detail: kind }));
    };
    return [
      new Plugin({
        key: imagePasteKey,
        props: {
          handlePaste(view, event) {
            const data = event.clipboardData;
            const files = imageFilesOf(data);
            const html = data?.getData("text/html") ?? "";
            if (files.length > 0) {
              // Con HTML que lleva texto además de la imagen (p. ej. una web copiada), se deja pegar el texto.
              const text = html ? html.replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() : "";
              if (text.length > 0) return false;
              event.preventDefault();
              void insertImages(view, files).then((count) => { if (count === 0) notify("error"); });
              return true;
            }
            if (html) {
              const found = htmlImages(html);
              const text = html.replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
              if (!text && found.data.length > 0) {
                event.preventDefault();
                void insertImages(view, found.data.map(dataUrlBlob));
                return true;
              }
              if (!text && found.remote > 0) {
                notify("remote");
                return true;
              }
            }
            return false;
          },
          handleDrop(view, event, _slice, moved) {
            if (moved) return false;
            const files = imageFilesOf(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            let pos = at?.pos;
            if (pos !== undefined) {
              const $pos = view.state.doc.resolve(pos);
              pos = $pos.depth > 0 ? $pos.after(1) : pos;
            }
            void insertImages(view, files, pos);
            return true;
          },
        },
      }),
    ];
  },
});
