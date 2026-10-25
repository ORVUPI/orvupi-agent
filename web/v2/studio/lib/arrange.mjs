/** Operaciones de lienzo que el editor aplica y que las pruebas pueden repetir. */

export function fitScale(docW, docH, availW, availH) {
  const width = Math.max(1, Number(docW) || 1);
  const height = Math.max(1, Number(docH) || 1);
  const roomW = Math.max(1, Number(availW) || 1);
  const roomH = Math.max(1, Number(availH) || 1);
  return Math.min(roomW / width, roomH / height, 1);
}

export function distributeLayers(doc, ids, axis) {
  const picked = (doc?.layers || []).filter((layer) => ids.includes(layer.id) && !layer.locked);
  if (picked.length < 3) return doc;
  const key = axis === "y" ? "y" : "x";
  const size = axis === "y" ? "h" : "w";
  const sorted = [...picked].sort((a, b) => a[key] - b[key] || String(a.id).localeCompare(String(b.id)));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last[key] + last[size] - first[key];
  const total = sorted.reduce((sum, layer) => sum + layer[size], 0);
  const gap = (span - total) / (sorted.length - 1);
  let cursor = first[key];
  for (const layer of sorted) {
    layer[key] = Math.round(cursor);
    cursor += layer[size] + gap;
  }
  return doc;
}

export function duplicatePageAt(pages, index, mint) {
  if (!Array.isArray(pages) || pages.length >= 8) return null;
  const source = pages[index];
  if (!Array.isArray(source)) return null;
  const copy = source.map((layer) => {
    const next = JSON.parse(JSON.stringify(layer));
    next.id = mint();
    return next;
  });
  const at = index + 1;
  pages.splice(at, 0, copy);
  return at;
}

export function removePageAt(pages, index) {
  if (!Array.isArray(pages) || pages.length < 2 || !pages[index]) return false;
  pages.splice(index, 1);
  return true;
}

export function movePageAt(pages, from, to) {
  if (!Array.isArray(pages) || !pages[from] || to < 0 || to >= pages.length || from === to) return false;
  const [page] = pages.splice(from, 1);
  pages.splice(to, 0, page);
  return true;
}

export function proportionalSize(origin, dw, dh, lock) {
  const w = Math.max(8, Math.round(origin.w + dw));
  if (!lock) return { w, h: Math.max(8, Math.round(origin.h + dh)) };
  const ratio = origin.h ? origin.w / origin.h : 1;
  return { w, h: Math.max(8, Math.round(w / ratio)) };
}

export function shiftCrop(crop, edge, dx, dy) {
  const next = {
    x: Number(crop?.x) || 0,
    y: Number(crop?.y) || 0,
    w: Math.max(1, Number(crop?.w) || 1),
    h: Math.max(1, Number(crop?.h) || 1),
  };
  if (edge === "move") {
    next.x += dx;
    next.y += dy;
  }
  if (edge === "e" || edge === "se") next.w = Math.max(1, next.w + dx);
  if (edge === "s" || edge === "se") next.h = Math.max(1, next.h + dy);
  if (edge === "w") {
    next.x += dx;
    next.w = Math.max(1, next.w - dx);
  }
  if (edge === "n") {
    next.y += dy;
    next.h = Math.max(1, next.h - dy);
  }
  return next;
}

export function snapBox(box, peers, canvas, threshold = 6) {
  const xs = [0, Math.round((canvas.width - box.w) / 2), canvas.width - box.w];
  const ys = [0, Math.round((canvas.height - box.h) / 2), canvas.height - box.h];
  for (const peer of peers) {
    xs.push(peer.x, peer.x + peer.w - box.w);
    ys.push(peer.y, peer.y + peer.h - box.h);
  }
  let x = box.x;
  let y = box.y;
  let guideX = null;
  let guideY = null;
  let bestX = threshold + 1;
  let bestY = threshold + 1;
  for (const target of xs) {
    const delta = target - box.x;
    if (Math.abs(delta) <= threshold && Math.abs(delta) < Math.abs(bestX)) {
      bestX = delta;
      x = box.x + delta;
      guideX = target;
    }
  }
  for (const target of ys) {
    const delta = target - box.y;
    if (Math.abs(delta) <= threshold && Math.abs(delta) < Math.abs(bestY)) {
      bestY = delta;
      y = box.y + delta;
      guideY = target;
    }
  }
  return { x, y, guideX, guideY };
}

export function cloneForPaste(layers, mint, dx = 24, dy = 24) {
  return (layers || []).map((layer) => {
    const copy = JSON.parse(JSON.stringify(layer));
    copy.id = mint();
    copy.x = Math.round((copy.x || 0) + dx);
    copy.y = Math.round((copy.y || 0) + dy);
    copy.groupId = "";
    return copy;
  });
}
