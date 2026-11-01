import { sitemapXml } from "./_lib/seo.js";

export async function onRequest(context) {
  try {
    return await sitemapXml(context.env || {}, context);
  } catch (error) {
    console.error("sonar-sitemap", error?.status || error?.code || "fail");
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>", {
      status: 200,
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }
}
