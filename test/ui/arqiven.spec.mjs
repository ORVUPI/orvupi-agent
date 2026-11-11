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
    await expect(page.locator("#source-note")).toContainText(item.note);
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
  }
  await expect(page.locator("#crumb")).toHaveCount(0);
  await expect(page.locator(".arq-who")).toHaveCount(0);
  await expect(page.locator("#new-chat-side")).toContainText(/Nuevo chat|New chat|Novo chat|新しいチャット|새 채팅/);
});

test("chats, proyectos e imágenes siguen en este navegador", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/arqiven/");
  await page.locator("#prompt").fill("Nota de prueba del chat");
  await page.locator("#send").click();
  await expect(page.locator("#recent").getByRole("button", { name: "Nota de prueba del chat" })).toBeVisible();
  await page.locator("#recent .recent-more").click();
  await page.getByRole("button", { name: "Renombrar" }).click();
  await page.locator("#ask-input").fill("Chat renombrado");
  await page.locator("#ask-ok").click();
  await page.locator("#search").fill("renombrado");
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toBeVisible();
  await page.locator("#search").fill("");
  await page.getByRole("button", { name: "Proyectos" }).click();
  await page.locator("#project-name").fill("Carpeta alfa");
  await page.locator("#project-create").click();
  await page.getByRole("button", { name: "Chats" }).click();
  await page.locator("#recent .recent-more").click();
  await page.getByRole("button", { name: "Mover a proyecto" }).click();
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
  await page.locator("#recent .recent-more").click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.locator("#ask-ok").click();
  await expect(page.locator("#recent").getByRole("button", { name: "Chat renombrado" })).toHaveCount(0);
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
