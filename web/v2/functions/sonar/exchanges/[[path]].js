import { renderSonarPage } from "../../../_lib/seo.js";

export async function onRequest(context) {
  const path = context.params.path;
  const id = Array.isArray(path) ? path[0] : path || "";
  return renderSonarPage(context.request, context.env || {}, context, { kind: "exchange", id });
}
