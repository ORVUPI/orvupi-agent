import { renderSonarPage } from "../../../_lib/seo.js";

export async function onRequest(context) {
  return renderSonarPage(context.request, context.env || {}, context, { kind: "crypto", id: context.params.slug });
}
