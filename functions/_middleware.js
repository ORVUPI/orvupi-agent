import { previewRedirect } from "./_lib/preview-host.js";

export async function onRequest(context) {
  const redirect = previewRedirect(context.request);
  if (redirect) return redirect;
  return context.next();
}
