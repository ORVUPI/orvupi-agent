import { handle } from "../../../_lib/router.js";

export async function onRequest(context) {
  return handle(context.request, context.env || {}, context);
}
