import { Node, mergeAttributes } from "@tiptap/core";
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

export function paintEquation(expr: string): string {
  return expr.replaceAll("^-1", "⁻¹").replaceAll("^2", "²").replaceAll("^3", "³").replaceAll("^1", "¹");
}

function ui(es: string, en: string): string {
  return document.documentElement.lang === "en" ? en : es;
}

function clip(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

type ViewNode = { attrs: Record<string, unknown> };

function bindText(input: HTMLInputElement, read: () => string, write: (value: string) => void) {
  input.addEventListener("mousedown", (event) => event.stopPropagation());
  input.addEventListener("input", () => write(input.value));
  input.addEventListener("focus", () => {
    input.value = read();
  });
}

export const Equation = Node.create({
  name: "equation",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      expr: {
        default: "E = mc^2",
        parseHTML: (element: HTMLElement) => clip(element.getAttribute("data-expr") || "E = mc^2", 200),
        renderHTML: (attributes: { expr?: string }) => ({ "data-expr": clip(String(attributes.expr ?? "E = mc^2"), 200) }),
      },
    };
  },
  parseHTML: () => [{ tag: "figure.ow-eq" }],
  renderHTML({ HTMLAttributes, node }) {
    return ["figure", mergeAttributes(HTMLAttributes, { class: "ow-eq" }), ["span", {}, paintEquation(String(node.attrs.expr ?? ""))]];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current: ViewNode = node;
      const dom = document.createElement("figure");
      dom.className = "ow-eq";
      dom.setAttribute("contenteditable", "false");
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 200;
      input.setAttribute("aria-label", ui("Ecuación", "Equation"));
      input.value = String(node.attrs.expr ?? "E = mc^2");
      const out = document.createElement("span");
      out.className = "ow-eq-out";
      out.textContent = paintEquation(input.value);
      bindText(input, () => String(current.attrs.expr ?? ""), (value) => {
        const expr = value.slice(0, 200);
        out.textContent = paintEquation(expr);
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, expr }));
      });
      dom.append(input, out);
      return {
        dom,
        update(updated) {
          current = updated;
          if (document.activeElement !== input) input.value = String(updated.attrs.expr ?? "");
          out.textContent = paintEquation(String(updated.attrs.expr ?? ""));
          return true;
        },
      };
    };
  },
});

function series(labels: string, values: string): { labels: string[]; values: number[] } {
  const names = labels.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const numbers = values.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item)).slice(0, 8);
  const count = Math.max(names.length, numbers.length, 1);
  return {
    labels: Array.from({ length: count }, (_, index) => names[index] || String(index + 1)),
    values: Array.from({ length: count }, (_, index) => numbers[index] ?? 0),
  };
}

export const DocChart = Node.create({
  name: "docChart",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      title: {
        default: "Gráfico",
        parseHTML: (element: HTMLElement) => clip(element.getAttribute("data-title") || "Gráfico", 80),
        renderHTML: (attributes: { title?: string }) => ({ "data-title": String(attributes.title ?? "Gráfico").slice(0, 80) }),
      },
      labels: {
        default: "Uno,Dos,Tres",
        parseHTML: (element: HTMLElement) => (element.getAttribute("data-labels") || "Uno,Dos,Tres").slice(0, 120),
        renderHTML: (attributes: { labels?: string }) => ({ "data-labels": String(attributes.labels ?? "").slice(0, 120) }),
      },
      values: {
        default: "4,7,3",
        parseHTML: (element: HTMLElement) => (element.getAttribute("data-values") || "4,7,3").slice(0, 80),
        renderHTML: (attributes: { values?: string }) => ({ "data-values": String(attributes.values ?? "").slice(0, 80) }),
      },
    };
  },
  parseHTML: () => [{ tag: "figure.ow-doc-chart" }],
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { class: "ow-doc-chart" })];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current: ViewNode = node;
      const dom = document.createElement("figure");
      dom.className = "ow-doc-chart";
      dom.setAttribute("contenteditable", "false");
      const title = document.createElement("input");
      title.type = "text";
      title.maxLength = 80;
      title.setAttribute("aria-label", ui("Título del gráfico", "Chart title"));
      const labels = document.createElement("input");
      labels.type = "text";
      labels.maxLength = 120;
      labels.setAttribute("aria-label", ui("Etiquetas del gráfico", "Chart labels"));
      const values = document.createElement("input");
      values.type = "text";
      values.maxLength = 80;
      values.setAttribute("aria-label", ui("Valores del gráfico", "Chart values"));
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 200;
      canvas.setAttribute("role", "img");
      const paint = () => {
        canvas.setAttribute("aria-label", ui("Gráfico", "Chart"));
        const data = series(String(current.attrs.labels ?? ""), String(current.attrs.values ?? ""));
        const existing = Chart.getChart(canvas);
        existing?.destroy();
        new Chart(canvas, {
          type: "bar",
          data: {
            labels: data.labels,
            datasets: [{ data: data.values, backgroundColor: ["#ff3070", "#1d4e89", "#0b5d36", "#7a4a00"], borderWidth: 0 }],
          },
          options: { animation: false, responsive: false, plugins: { legend: { display: false } } },
        });
      };
      const write = (patch: Record<string, string>) => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, ...patch }));
      };
      title.value = String(node.attrs.title ?? "Gráfico");
      labels.value = String(node.attrs.labels ?? "Uno,Dos,Tres");
      values.value = String(node.attrs.values ?? "4,7,3");
      bindText(title, () => String(current.attrs.title ?? ""), (value) => write({ title: value.slice(0, 80) }));
      bindText(labels, () => String(current.attrs.labels ?? ""), (value) => write({ labels: value.slice(0, 120) }));
      bindText(values, () => String(current.attrs.values ?? ""), (value) => write({ values: value.slice(0, 80) }));
      dom.append(title, labels, values, canvas);
      current = node;
      paint();
      return {
        dom,
        update(updated) {
          current = updated;
          if (document.activeElement !== title) title.value = String(updated.attrs.title ?? "");
          if (document.activeElement !== labels) labels.value = String(updated.attrs.labels ?? "");
          if (document.activeElement !== values) values.value = String(updated.attrs.values ?? "");
          paint();
          return true;
        },
        destroy() {
          Chart.getChart(canvas)?.destroy();
        },
      };
    };
  },
});

const DRAW_COLORS = ["#ff3070", "#1d4e89", "#0b5d36"];

function hexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export const DocDrawing = Node.create({
  name: "docDrawing",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      a: { default: DRAW_COLORS[0], parseHTML: (element: HTMLElement) => hexColor(element.getAttribute("data-a"), DRAW_COLORS[0] ?? "#ff3070"), renderHTML: (attributes: { a?: string }) => ({ "data-a": hexColor(attributes.a, DRAW_COLORS[0] ?? "#ff3070") }) },
      b: { default: DRAW_COLORS[1], parseHTML: (element: HTMLElement) => hexColor(element.getAttribute("data-b"), DRAW_COLORS[1] ?? "#1d4e89"), renderHTML: (attributes: { b?: string }) => ({ "data-b": hexColor(attributes.b, DRAW_COLORS[1] ?? "#1d4e89") }) },
      c: { default: DRAW_COLORS[2], parseHTML: (element: HTMLElement) => hexColor(element.getAttribute("data-c"), DRAW_COLORS[2] ?? "#0b5d36"), renderHTML: (attributes: { c?: string }) => ({ "data-c": hexColor(attributes.c, DRAW_COLORS[2] ?? "#0b5d36") }) },
    };
  },
  parseHTML: () => [{ tag: "figure.ow-doc-draw" }],
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { class: "ow-doc-draw" })];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current: ViewNode = node;
      const dom = document.createElement("figure");
      dom.className = "ow-doc-draw";
      dom.setAttribute("contenteditable", "false");
      const row = document.createElement("div");
      row.className = "ow-doc-draw-colors";
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 160;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", ui("Dibujo", "Drawing"));
      const inputs = DRAW_COLORS.map((fallback, index) => {
        const key = index === 0 ? "a" : index === 1 ? "b" : "c";
        const input = document.createElement("input");
        input.type = "color";
        input.value = hexColor(node.attrs[key], fallback);
        input.setAttribute("aria-label", ui(`Color ${index + 1} del dibujo`, `Drawing color ${index + 1}`));
        input.addEventListener("mousedown", (event) => event.stopPropagation());
        input.addEventListener("input", () => {
          const pos = getPos();
          if (typeof pos !== "number") return;
          editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, [key]: input.value }));
        });
        row.append(input);
        return input;
      });
      const paint = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const a = hexColor(current.attrs.a, DRAW_COLORS[0] ?? "#ff3070");
        const b = hexColor(current.attrs.b, DRAW_COLORS[1] ?? "#1d4e89");
        const c = hexColor(current.attrs.c, DRAW_COLORS[2] ?? "#0b5d36");
        ctx.clearRect(0, 0, 360, 160);
        ctx.fillStyle = "#fff8ec";
        ctx.fillRect(0, 0, 360, 160);
        ctx.fillStyle = a;
        ctx.fillRect(24, 36, 90, 64);
        ctx.strokeStyle = b;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(130, 68);
        ctx.lineTo(230, 68);
        ctx.stroke();
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(280, 68, 28, 0, Math.PI * 2);
        ctx.fill();
      };
      dom.append(row, canvas);
      current = node;
      paint();
      return {
        dom,
        update(updated) {
          current = updated;
          inputs.forEach((input, index) => {
            const key = index === 0 ? "a" : index === 1 ? "b" : "c";
            if (document.activeElement !== input) input.value = hexColor(updated.attrs[key], DRAW_COLORS[index] ?? "#102032");
          });
          paint();
          return true;
        },
      };
    };
  },
});
