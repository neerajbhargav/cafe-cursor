import {
  detectPlatform,
  handleFromUrl,
  normalizeUrl,
  prettyNameFromHandle,
} from "./platforms";
import type { Platform, UnfurlResult } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decode(m[1]);
  }
  return null;
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .trim();
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decode(m[1]) : null;
}

function absUrl(maybe: string | null, base: string): string | null {
  if (!maybe) return null;
  try {
    return new URL(maybe, base).href;
  } catch {
    return null;
  }
}

function cleanTitle(title: string, platform: Platform, handle: string): string {
  let cleaned = title
    .replace(/\s*[|\-–—]\s*(LinkedIn|Instagram|X|Twitter|GitHub|YouTube|TikTok|Bluesky|Threads).*$/i, "")
    .replace(/\s+on\s+(LinkedIn|Instagram|X|Twitter)$/i, "")
    .replace(/\s*\(@[\w.]+\)\s*$/i, "")
    .trim();

  // LinkedIn OG titles are often "Name - Role, Company"
  if (platform === "linkedin") {
    const beforeDash = cleaned.split(/\s+[|\-–—]\s+/)[0]?.trim();
    if (beforeDash) cleaned = beforeDash;
  }

  if (!cleaned && handle) return prettyNameFromHandle(handle);
  return cleaned;
}

async function githubProfile(handle: string): Promise<Partial<UnfurlResult> | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": "cafe-cursor-wall", Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      login?: string;
      bio?: string;
      avatar_url?: string;
      blog?: string;
    };
    return {
      name: data.name || data.login || handle,
      handle: data.login || handle,
      title: data.name || data.login || handle,
      description: data.bio || "",
      image: data.avatar_url || null,
      avatar: data.avatar_url || null,
    };
  } catch {
    return null;
  }
}

export async function unfurl(raw: string): Promise<UnfurlResult> {
  const url = normalizeUrl(raw);
  const platform = detectPlatform(url);
  const handle = handleFromUrl(url, platform);
  const fallbackName = prettyNameFromHandle(handle) || handle || "Someone here";

  const base: UnfurlResult = {
    url,
    platform,
    name: fallbackName,
    handle: handle || "",
    title: fallbackName,
    description: "",
    image: null,
    avatar: null,
  };

  if (platform === "email") {
    const email = url.replace(/^mailto:/i, "");
    return { ...base, name: email.split("@")[0] || email, handle: email, title: email };
  }

  if (platform === "github" && handle) {
    const gh = await githubProfile(handle);
    if (gh) return { ...base, ...gh, url, platform };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return base;
    const html = (await res.text()).slice(0, 180_000);
    const ogTitle = meta(html, "og:title") || meta(html, "twitter:title") || titleTag(html);
    const ogDesc = meta(html, "og:description") || meta(html, "twitter:description") || "";
    const ogImage = absUrl(
      meta(html, "og:image") || meta(html, "twitter:image") || meta(html, "og:image:url"),
      url,
    );
    const name = ogTitle ? cleanTitle(ogTitle, platform, handle) : fallbackName;
    return {
      ...base,
      name: name || fallbackName,
      title: name || fallbackName,
      description: ogDesc.slice(0, 240),
      image: ogImage,
      avatar: ogImage,
    };
  } catch {
    return base;
  }
}
