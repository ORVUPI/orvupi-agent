import { expect, test } from "@playwright/test";

const pages = [
  { path: "/arqiven/", ask: "¿Cuál es el contrato oficial de ORVUPI?", marker: "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", buy: "¿Compro ORVUPI ahora?", refusal: "consejo financiero", note: "no tiene un modelo propio" },
  { path: "/en/arqiven/", ask: "What is the only official ORVUPI contract?", marker: "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", buy: "Should I buy ORVUPI now?", refusal: "financial advice", note: "no model of its own" },
  { path: "/pt-br/arqiven/", ask: "Qual é o único contrato oficial da ORVUPI?", marker: "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", buy: "Devo comprar ORVUPI agora?", refusal: "conselho financeiro", note: "não tem um modelo próprio" },
  { path: "/ja/arqiven/", ask: "ORVUPI の公式コントラクトは何ですか。", marker: "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", buy: "今 ORVUPI を買うべきですか。", refusal: "財務上の助言はできません", note: "独自モデルはありません" },
  { path: "/ko/arqiven/", ask: "ORVUPI의 공식 컨트랙트는 무엇인가요?", marker: "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", buy: "지금 ORVUPI를 사야 할까요?", refusal: "재정 조언은 하지 않습니다", note: "자체 모델은 없습니다" },
];

test.beforeEach(async ({ page }) => {
  await page.route(/huggingface\.co|cdn\.jsdelivr\.net|wikipedia\.org/, (route) => route.abort());
});

test("una pregunta general no arrastra páginas de ORVUPI y elige el título de Wikipedia", async ({ page }) => {
  await page.route(/wikipedia\.org/, async (route) => {
    const url = route.request().url();
    if (url.includes("list=search")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ query: { search: [{ title: "Curia romana" }, { title: "Marie Curie" }] } }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        type: "standard",
        title: "Marie Curie",
        extract: "Marie Curie fue una física y química polaca, pionera en el estudio de la radiactividad.",
        content_urls: { desktop: { page: "https://es.wikipedia.org/wiki/Marie_Curie" } },
      }),
    });
  });
  await page.goto("/arqiven/");
  await page.locator("#prompt").fill("¿Quién fue Marie Curie?");
  await page.locator("#send").click();
  const answer = page.locator(".assistant").last();
  await expect(answer.locator(".sources a")).toHaveCount(1);
  await expect(answer.locator(".sources a")).toHaveAttribute("href", /Marie_Curie/);
  await expect(answer).not.toContainText(/claves|custodia/i);
  await page.locator("#prompt").fill("¿Qué es ORVUPI?");
  await page.locator("#send").click();
  const about = page.locator(".assistant").last();
  await expect(about.locator(".sources a").first()).toBeVisible();
  await expect(about).toContainText("ORVUPI");
  await expect(about).not.toContainText("versión de la versión");
});

for (const item of pages) {
  test(`${item.path} cita la fuente, nombra al tercero y rechaza el consejo`, async ({ page }) => {
    const posts = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });
    await page.goto(item.path);
    await expect(page.locator("header.site")).toHaveCount(0);
    await expect(page.locator("footer.or-footer")).toHaveCount(0);
    await expect(page.locator(".arq-app .brand img")).toHaveAttribute("src", /\/assets\/arqiven\/logo-oficial\.png/);
    await expect(page.locator("body")).not.toContainText("STUBX");
    await expect(page.locator("#new-chat")).toBeVisible();
    await expect(page.locator("#send")).toBeVisible();
    await expect(page.locator("#prompt")).toBeVisible();
    await expect(page.locator("#local-editor")).toBeHidden();
    await expect(page.locator("#source-note")).toContainText(item.note);
    await expect(page.locator("#model-pick option[value='qwen35-cpu']")).toHaveText(/Qwen3\.5-0\.8B/);
    await expect(page.locator("#model-pick option[value='smol135-cpu']")).toHaveText(/SmolLM2-135M-Instruct/);
    await expect(page.locator("#engine-progress")).toContainText(/SmolLM2/);
    await expect(page.locator("#model-indicator")).toContainText("SmolLM2-135M-Instruct");
    await expect(page.locator("#model-indicator")).toContainText(/tercero|third party|terceiro|第三者|제3자/);

    await page.locator("#prompt").fill(item.ask);
    await page.locator("#send").click();
    const answer = page.locator(".assistant").last();
    await expect(answer).toContainText(item.marker);
    await expect(answer).not.toContainText("Este aviso se sustituye");
    await expect(answer).not.toContainText("none · none");
    await expect(answer).not.toContainText("rules ·");
    await expect(page.locator("#recent button").first()).toContainText(item.ask.slice(0, 24));
    await expect(answer.locator(".sources a").first()).toHaveAttribute("href", /token/);

    await page.locator("#prompt").fill(item.buy);
    await page.locator("#send").click();
    await expect(page.locator(".assistant").last()).toContainText(item.refusal);
    await expect(page.locator("#local-editor")).toBeHidden();

    await page.locator(".vote[data-vote='up']").first().click();
    await expect(page.locator(".vote[data-vote='up']").first()).toHaveAttribute("aria-pressed", "true");
    if (await page.locator("#menu").isVisible()) await page.locator("#menu").click();
    await page.locator("#open-settings").click();
    const download = page.waitForEvent("download");
    await page.locator("#export-feedback").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("arqiven-votos.json");
    expect(posts).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("la bienvenida queda centrada en pantallas anchas", async ({ page }) => {
  await page.goto("/arqiven/");
  for (const width of [1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const title = await page.locator("#welcome h2").boundingBox();
    const area = await page.locator(".workspace").boundingBox();
    expect(title && area).toBeTruthy();
    const delta = Math.abs((title.x + title.width / 2) - (area.x + area.width / 2));
    expect(delta).toBeLessThan(40);
    const welcome = await page.locator("#welcome").boundingBox();
    const note = await page.locator(".composer-area .note").boundingBox();
    const view = await page.locator(".view").boundingBox();
    expect(welcome && note && view).toBeTruthy();
    const mid = (welcome.y + note.y + note.height) / 2;
    expect(Math.abs(mid - (view.y + view.height / 2))).toBeLessThan(70);
  }
  await expect(page.locator("#crumb")).toHaveCount(0);
  await expect(page.locator(".arq-who")).toHaveCount(0);
  await expect(page.locator("#new-chat-side")).toContainText(/Nuevo chat|New chat|Novo chat|新しいチャット|새 채팅/);
});

async function openChatMenu(page) {
  await page.locator("#recent .recent-more").click();
  const menu = page.locator(".row-menu");
  await expect(menu).toBeVisible();
  return menu;
}

async function chatMenuItem(page, name) {
  return (await openChatMenu(page)).getByRole("menuitem", { name });
}

test("el menú del chat desaparece al cerrarlo", async ({ page }) => {
  await page.goto("/arqiven/");
  await page.locator("#prompt").fill("Nota para cerrar el menú");
  await page.locator("#send").click();
  const drawer = page.locator("#menu");
  if (await drawer.isVisible()) await drawer.click();
  await expect(page.locator("#recent").getByRole("button", { name: "Nota para cerrar el menú" })).toBeVisible();
  const menu = page.locator(".row-menu");
  const more = page.locator("#recent .recent-more");

  await test.step("escape", async () => {
    await more.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  await test.step("fuera", async () => {
    await more.click();
    await expect(menu).toBeVisible();
    await page.locator("#search").click();
    await expect(menu).toBeHidden();
  });

  await test.step("acción", async () => {
    await more.click();
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "Renombrar" }).click();
    await page.locator("#ask-ok").click();
    await expect(menu).toBeHidden();
  });
});

test("chats, proyectos e imágenes siguen en este navegador", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/arqiven/");
  await page.locator("#prompt").fill("Nota de prueba del chat");
  await page.locator("#send").click();
  await expect(page.locator("#recent").getByRole("button", { name: "Nota de prueba del chat" })).toBeVisible();
  await (await chatMenuItem(page, "Renombrar")).click();
  await page.locator("#ask-input").fill("Chat renombrado");
  await page.locator("#ask-ok").click();
  await page.locator("#search").fill("renombrado");
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toBeVisible();
  await page.locator("#search").fill("");
  await page.getByRole("button", { name: "Proyectos" }).click();
  await page.locator("#project-name").fill("Carpeta alfa");
  await page.locator("#project-create").click();
  await page.getByRole("button", { name: "Chats" }).click();
  await (await chatMenuItem(page, "Mover a proyecto")).click();
  await page.locator("#ask-input").fill("Carpeta alfa");
  await page.locator("#ask-ok").click();
  await page.getByRole("button", { name: "Proyectos" }).click();
  await page.getByRole("button", { name: "Carpeta alfa" }).click();
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toBeVisible();
  await page.getByRole("button", { name: "Proyectos" }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.locator("#ask-ok").click();
  await page.getByRole("button", { name: "Chats" }).click();
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toBeVisible();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator("#file-input").setInputFiles({ name: "punto.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page.locator(".library-card").click();
  await expect(page.locator("#viewer-img")).toBeVisible();
  await page.locator("#viewer-delete").click();
  await page.locator("#ask-ok").click();
  await expect(page.locator(".library-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toBeVisible();
  await (await chatMenuItem(page, "Eliminar")).click();
  await page.locator("#ask-ok").click();
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toHaveCount(0);
});

test("en el móvil, si el modelo no carga, el chat sigue y el aviso no entra en el historial", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/arqiven/");
  const notice = page.locator("#engine-progress");
  await expect(notice).toContainText("Qwen3.5-0.8B no se ha podido cargar");
  await expect(notice).toContainText("SmolLM2");
  await expect(page.locator("#status")).toContainText("SmolLM2");
  await expect(page.locator("#prompt")).toBeVisible();
  await expect(page.locator("#send")).toBeVisible();
  await expect(page.locator(".assistant")).toHaveCount(0);
  await page.locator("#prompt").fill("¿Compro ORVUPI ahora?");
  await page.locator("#send").click();
  const answer = page.locator(".assistant").last();
  await expect(answer).toContainText("consejo financiero");
  await expect(answer).not.toContainText("no se ha podido cargar");
  await expect(notice).toContainText("SmolLM2");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const box = await page.locator("#send").boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= 845).toBeTruthy();
});

test("la elección de modelo queda guardada en este navegador", async ({ page }) => {
  await page.goto("/arqiven/");
  await expect(page.locator("#model-pick")).toBeAttached();
  if (await page.locator("#menu").isVisible()) await page.locator("#menu").click();
  await page.locator("#open-settings").click();
  await page.locator("#model-pick").selectOption("qwen05-cpu");
  await page.waitForFunction(async () => {
    const value = await new Promise((resolve) => {
      const request = indexedDB.open("orvupi-arqiven-settings");
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction("settings", "readonly").objectStore("settings").get("model");
        get.onsuccess = () => {
          db.close();
          resolve(get.result?.value || "");
        };
      };
    });
    return value === "qwen05-cpu";
  });
  await page.reload();
  await page.waitForFunction(async () => {
    const value = await new Promise((resolve) => {
      const request = indexedDB.open("orvupi-arqiven-settings");
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction("settings", "readonly").objectStore("settings").get("model");
        get.onsuccess = () => {
          db.close();
          resolve(get.result?.value || "");
        };
      };
    });
    return value === "qwen05-cpu";
  });
  await expect(page.locator("#model-pick option[value='smol135-cpu']")).toHaveCount(1);
});

test("la ventana simulada no recorta el cuadro ni abre scroll horizontal", async ({ page }) => {
  const sizes = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ];
  await page.goto("/arqiven/");
  for (const size of sizes) {
    await page.setViewportSize(size);
    const box = await page.locator("#send").boundingBox();
    expect(box && box.y + box.height <= size.height + 1).toBeTruthy();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 500 });
  await page.locator("#menu").click();
  await expect(page.locator("#sidebar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#sidebar")).toBeHidden();
});

const SLOW_WORKER = `
let stopped = false;
let count = 0;
self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "stop") {
    stopped = true;
    return;
  }
  if (msg.type === "load") {
    self.postMessage({ type: "ready" });
    return;
  }
  if (msg.type !== "generate") return;
  stopped = false;
  count += 1;
  const slow = count === 1;
  self.postMessage({ type: "token", id: msg.id, text: slow ? "Empiezo " : "Listo: el motor ya está libre." });
  const started = Date.now();
  while (slow && Date.now() - started < 5000 && !stopped) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  self.postMessage({ type: "done", id: msg.id, text: slow ? "Empiezo la mudanza con calma y sin prisa." : "Listo: el motor ya está libre para otra pregunta.", tokens: 8, ms: Math.max(1, Date.now() - started), threads: 1 });
  self.postMessage({ type: "settled", id: msg.id });
};
`;

test("detener suelta el motor y 5 por 8 no espera al modelo", async ({ page }) => {
  await page.route("**/engine-worker.mjs*", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    headers: {
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "credentialless",
    },
    body: SLOW_WORKER,
  }));
  await page.goto("/arqiven/");
  await expect(page.locator("#engine-progress")).toContainText("Modelo de terceros listo", { timeout: 15000 });
  await page.locator("#prompt").fill("Explica con detalle, paso a paso, cómo organizar una mudanza internacional");
  await page.locator("#send").click();
  await expect(page.locator(".assistant").last()).toContainText("Empiezo");
  await expect(page.locator("#stop")).toBeVisible();
  await page.locator("#stop").click();
  await page.locator("#prompt").fill("¿Cuánto es 5 por 8?");
  await page.locator("#send").click();
  await expect(page.locator(".assistant").last()).toContainText("40", { timeout: 3000 });
  await page.locator("#prompt").fill("Di hola");
  await page.locator("#send").click();
  await expect(page.locator(".assistant").last()).toContainText("ya está libre", { timeout: 5000 });
});

const QUEUE_WORKER = `
function slot(name, value) {
  return new Promise((resolve) => {
    const open = indexedDB.open("arqiven-worker-test", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("k");
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("k", "readwrite");
      const store = tx.objectStore("k");
      if (value === undefined) {
        const get = store.get(name);
        get.onsuccess = () => { db.close(); resolve(get.result || 0); };
      } else {
        store.put(value, name);
        tx.oncomplete = () => { db.close(); resolve(value); };
      }
    };
  });
}
self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "load") {
    const seen = await slot("loads");
    await slot("loads", seen + 1);
    if (seen > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
    self.postMessage({ type: "ready" });
    return;
  }
  if (msg.type === "stop") return;
  if (msg.type !== "generate") return;
  const loads = await slot("loads");
  if (loads <= 1) {
    self.postMessage({ type: "token", id: msg.id, text: "Empiezo " });
    const started = Date.now();
    while (Date.now() - started < 20000) {}
    return;
  }
  const cap = Number(msg.maxTokens) || 0;
  await new Promise((resolve) => setTimeout(resolve, 700));
  const text = "Listo: el motor ya está libre para otra pregunta. Tope " + cap + ".";
  self.postMessage({ type: "token", id: msg.id, text });
  self.postMessage({ type: "done", id: msg.id, text, tokens: cap, ms: 1, threads: 1 });
  self.postMessage({ type: "settled", id: msg.id });
};
`;

test("tras detener, la pregunta espera a que el modelo esté listo", async ({ page }) => {
  await page.route("**/engine-worker.mjs*", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    headers: {
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "credentialless",
    },
    body: QUEUE_WORKER,
  }));
  await page.goto("/arqiven/");
  await expect(page.locator("#engine-progress")).toContainText("Modelo de terceros listo", { timeout: 15000 });
  await page.locator("#prompt").fill("Explica con detalle, paso a paso, cómo organizar una mudanza internacional");
  await page.locator("#send").click();
  await expect(page.locator(".assistant").last()).toContainText("Empiezo");
  await page.locator("#stop").click();
  await page.locator("#prompt").fill("Di hola");
  await page.locator("#send").click();
  await expect(page.locator("#status")).toContainText("Preparando el modelo", { timeout: 3000 });
  await page.waitForTimeout(400);
  await expect(page.locator("#status")).toContainText("Preparando el modelo");
  const answer = page.locator(".assistant").last();
  await expect(answer).toContainText("ya está libre", { timeout: 8000 });
  await expect(answer).toContainText("Tope 45");
  await expect(answer).not.toContainText("Tope 320");
});

test("la marca y la fuente van en el idioma de la pregunta", async ({ page }) => {
  await page.goto("/arqiven/");
  const cases = [
    ["What is ORVUPI?", "Verified ORVUPI answer.", "Sources"],
    ["O que é a ORVUPI?", "Resposta verificada da ORVUPI.", "Fontes"],
    ["ORVUPI とは何ですか。", "ORVUPI の確認済みの回答です。", "出典"],
    ["ORVUPI란 무엇입니까?", "ORVUPI가 확인한 답입니다。", "출처"],
  ];
  for (const [ask, badge, label] of cases) {
    await page.locator("#prompt").fill(ask);
    await page.locator("#send").click();
    const answer = page.locator(".assistant").last();
    await expect(answer.locator(".badge")).toHaveText(badge);
    await expect(answer.locator(".sources-label")).toHaveText(label);
    await expect(answer).not.toContainText("Respuesta verificada de ORVUPI");
  }
});
