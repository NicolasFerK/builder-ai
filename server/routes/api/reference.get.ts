import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";

const stripHtml = (value: string) => {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractMeta = (html: string, name: string) => {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`, "i");
  const match = html.match(regex);
  return match ? decodeHtml(match[1] || match[2] || "") : "";
};

const extractPropertyMeta = (html: string, property: string) => {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i");
  const match = html.match(regex);
  return match ? decodeHtml(match[1] || match[2] || "") : "";
};

const decodeHtml = (value: string) => {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
};

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const rawUrl = typeof query.url === "string" ? query.url : "";

  if (!rawUrl) {
    return { error: "Missing url parameter" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "Invalid url parameter" };
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 BuilderAI Reference Bot",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return { error: `Site fetch failed with status ${response.status}` }; 
    }

    const html = await response.text();
    const title =
      extractPropertyMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim() ||
      "Unknown";

    const description =
      extractPropertyMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      extractMeta(html, "twitter:description") ||
      "";

    const text = stripHtml(html);
    const content = text.length > 4000 ? text.slice(0, 4000) : text;

    return {
      url: url.toString(),
      title: decodeHtml(title) || "Unknown",
      description: decodeHtml(description),
      content,
    };
  } catch (error) {
    console.error("Reference fetch failed", error);
    return { error: "Unable to fetch referenced site" };
  }
});