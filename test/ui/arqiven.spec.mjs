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

for (const item of pages) {
  test(`${item.path} cita la fuente, nombra al tercero y rechaza el consejo`, async ({ page }) => {
    const posts = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });
    await page.goto(item.path);
    await expect(page.locator("header.site .brand img")).toHaveAttribute("src", /logotipo-empresarial\.png/);
    await expect(page.locator(".arq-app .brand img")).toHaveAttribute("src", /\/assets\/arqiven\/logo-oficial\.png/);
    await expect(page.locator("body")).not.toContainText("STUBX");
    await expect(page.locator("#source-note")).toContainText(item.note);
    await expect(page.locator("#model-indicator")).toContainText("SmolLM2-135M-Instruct");
    await expect(page.locator("#model-indicator")).toContainText(/tercero|third party|terceiro|第三者|제3자/);

    await page.locator("#prompt").fill(item.ask);
    await page.locator("#send").click();
    const answer = page.locator(".assistant").last();
    await expect(answer).toContainText(item.marker);
    await expect(answer.locator(".sources a").first()).toHaveAttribute("href", /token/);

    await page.locator("#prompt").fill(item.buy);
    await page.locator("#send").click();
    await expect(page.locator(".assistant").last()).toContainText(item.refusal);

    await page.locator(".vote[data-vote='up']").first().click();
    await expect(page.locator(".vote[data-vote='up']").first()).toHaveAttribute("aria-pressed", "true");
    const download = page.waitForEvent("download");
    await page.locator("#export-feedback").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("arqiven-votos.json");
    expect(posts).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
