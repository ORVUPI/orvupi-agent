import { renderSonarPage } from "../../_lib/seo.js";
import { specOf } from "../../sonar/[[path]].js";

const LANGS = new Set(["en", "pt-br", "ja", "ko"]);

export async function onRequest(context) {
  if (!LANGS.has(context.params.lang)) return new Response("Not found", { status: 404 });
  return renderSonarPage(context.request, context.env || {}, context, specOf(context.params.path));
}
