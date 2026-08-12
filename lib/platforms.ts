import type { Platform } from "./types";

export type PlatformMeta = {
  label: string;
  tint: string;
};

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  linkedin: { label: "LinkedIn", tint: "#7ea3c4" },
  x: { label: "X", tint: "#d4cfc6" },
  instagram: { label: "Instagram", tint: "#d08978" },
  github: { label: "GitHub", tint: "#c4bdb4" },
  youtube: { label: "YouTube", tint: "#d08080" },
  tiktok: { label: "TikTok", tint: "#9bb8c9" },
  bsky: { label: "Bluesky", tint: "#7eafd4" },
  threads: { label: "Threads", tint: "#cfc8be" },
  website: { label: "Site", tint: "#e0b48a" },
  email: { label: "Email", tint: "#e0b48a" },
  other: { label: "Link", tint: "#e0b48a" },
};

export function detectPlatform(raw: string): Platform {
  let host = "";
  try {
    const url = new URL(raw);
    if (url.protocol === "mailto:") return "email";
    host = url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "other";
  }

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  if (host === "x.com" || host === "twitter.com" || host === "www.x.com") return "x";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "github.com" || host === "gist.github.com") return "github";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
    return "youtube";
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "bsky.app") return "bsky";
  if (host === "threads.net" || host === "www.threads.net") return "threads";
  return "website";
}

export function handleFromUrl(raw: string, platform: Platform): string {
  try {
    const url = new URL(raw);
    if (url.protocol === "mailto:") return url.pathname || url.href.replace("mailto:", "");

    const parts = url.pathname.split("/").filter(Boolean);
    if (platform === "linkedin") {
      const inIdx = parts.findIndex((p) => p === "in" || p === "company");
      if (inIdx >= 0 && parts[inIdx + 1]) return parts[inIdx + 1].replace(/\/$/, "");
    }
    if (platform === "github" && parts[0]) return parts[0];
    if (platform === "x" && parts[0] && parts[0] !== "i") return parts[0];
    if (platform === "instagram" && parts[0] && parts[0] !== "p" && parts[0] !== "reel") {
      return parts[0];
    }
    if (platform === "bsky" && parts[0] === "profile" && parts[1]) return parts[1];
    if (platform === "threads" && parts[0]?.startsWith("@")) return parts[0].slice(1);
    if (parts[0]) return parts[0];
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function prettyNameFromHandle(handle: string): string {
  const cleaned = handle.replace(/^@/, "").replace(/[-_.]+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isAllowedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}
