import { renderSonarPage } from "../../_lib/seo.js";
import { specOf } from "../../sonar/[[path]].js";

const LANGS = new Set(["en", "pt-br", "ja", "ko"]);

export async function onRequest(context) {
  // /assets/sonar/*.mjs también encaja en /:lang/sonar/*: lo que no es un idioma pasa a los estáticos.
  if (!LANGS.has(context.params.lang)) return context.next();
  return renderSonarPage(context.request, context.env || {}, context, specOf(context.params.path));
}
