"use client";

import {
  GithubLogo,
  Globe,
  InstagramLogo,
  LinkSimple,
  LinkedinLogo,
  MagnifyingGlass,
  ShareNetwork,
  SpinnerGap,
  XLogo,
} from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Platform, PublicCard, UnfurlResult } from "@/lib/types";
import { ContactCardView } from "./contact-card";
import { Lightbox } from "./lightbox";

const TOKEN_KEY = "cafe-cursor:tokens";
const FILTERS: { id: Platform | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "github", label: "GitHub" },
  { id: "website", label: "Sites" },
];

function getTokenSnapshot(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "{}";
  } catch {
    return "{}";
  }
}

function subscribeTokens(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("cafe-tokens", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("cafe-tokens", onChange);
  };
}

function bumpTokens() {
  window.dispatchEvent(new Event("cafe-tokens"));
}

function parseTokens(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveToken(id: string, token: string) {
  const next = { ...parseTokens(getTokenSnapshot()), [id]: token };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
  bumpTokens();
}

function dropToken(id: string) {
  const next = parseTokens(getTokenSnapshot());
  delete next[id];
  localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
  bumpTokens();
}

export function Wall({ initialCards }: { initialCards: PublicCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const tokenJson = useSyncExternalStore(subscribeTokens, getTokenSnapshot, () => "{}");
  const tokens = useMemo(() => {
    try {
      return JSON.parse(tokenJson) as Record<string, string>;
    } catch {
      return {};
    }
  }, [tokenJson]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Platform | "all">("all");
  const [open, setOpen] = useState<PublicCard | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<UnfurlResult | null>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<number | null>(null);
  const unfurlSeq = useRef(0);

  useEffect(() => {
    const tick = window.setInterval(async () => {
      const res = await fetch("/api/cards", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { cards: PublicCard[] };
      setCards(data.cards);
    }, 12_000);
    return () => window.clearInterval(tick);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const copy = useCallback(
    async (text: string, msg = "Copied") => {
      await navigator.clipboard.writeText(text);
      flash(msg);
    },
    [flash],
  );

  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    const trimmed = url.trim();
    const seq = ++unfurlSeq.current;
    if (!trimmed) return;

    debounce.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/unfurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        if (seq !== unfurlSeq.current) return;
        if (!res.ok) {
          setPreview(null);
          setPreviewSource(trimmed);
          return;
        }
        const meta = (await res.json()) as UnfurlResult;
        setPreview(meta);
        setPreviewSource(trimmed);
        setName((current) => current || meta.name);
      } catch {
        if (seq !== unfurlSeq.current) return;
        setPreview(null);
        setPreviewSource(trimmed);
      }
    }, 450);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [url]);

  async function dropCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a link first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), name: name.trim(), note: note.trim() }),
      });
      const data = (await res.json()) as { card?: PublicCard; token?: string; error?: string };
      if (!res.ok || !data.card || !data.token) {
        setError(data.error || "Could not drop that card.");
        return;
      }
      saveToken(data.card.id, data.token);
      setCards((prev) => [data.card!, ...prev.filter((c) => c.id !== data.card!.id)]);
      setUrl("");
      setName("");
      setNote("");
      setPreview(null);
      setPreviewSource("");
      flash("You are on the wall");
    } catch {
      setError("Network hiccup. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(card: PublicCard) {
    const token = tokens[card.id];
    if (!token) return;
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      flash("Could not remove");
      return;
    }
    dropToken(card.id);
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setOpen(null);
    flash("Removed");
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter !== "all") {
        if (filter === "website") {
          if (c.platform !== "website" && c.platform !== "other" && c.platform !== "email") {
            return false;
          }
        } else if (c.platform !== filter) return false;
      }
      if (!q) return true;
      return [c.name, c.handle, c.note, c.description, c.url].join(" ").toLowerCase().includes(q);
    });
  }, [cards, filter, query]);

  const shownPreview = preview && previewSource === url.trim() ? preview : null;
  const waitingOnLink = Boolean(url.trim()) && previewSource !== url.trim();

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-ink/75 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:p-2 sm:pr-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand font-mono text-[11px] font-medium text-ink">
              CC
            </div>
            <div>
              <p className="font-sans text-sm font-medium tracking-tight text-paper">Cafe Cursor</p>
              <p className="font-mono text-[10px] text-mute">
                {cards.length} {cards.length === 1 ? "card" : "cards"} in the room
              </p>
            </div>
          </div>

          <label className="relative min-w-0 flex-1">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mute"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names, handles, notes"
              className="h-10 w-full rounded-full border border-white/10 bg-ink-2 pr-4 pl-9 font-sans text-sm text-paper outline-none placeholder:text-mute/80 focus:border-sand/40"
            />
          </label>

          <button
            type="button"
            onClick={() => copy(window.location.href, "Wall link copied. Drop it in Luma.")}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-sand px-4 font-sans text-sm font-medium text-ink transition hover:bg-sand-2 active:scale-[0.98]"
          >
            Share wall
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10">
              <ShareNetwork size={13} />
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] transition ${
                filter === f.id
                  ? "bg-paper text-ink"
                  : "border border-white/10 text-mute hover:text-paper"
              }`}
            >
              {f.id === "linkedin" ? <LinkedinLogo size={12} /> : null}
              {f.id === "x" ? <XLogo size={12} /> : null}
              {f.id === "instagram" ? <InstagramLogo size={12} /> : null}
              {f.id === "github" ? <GithubLogo size={12} /> : null}
              {f.id === "website" ? <Globe size={12} /> : null}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-44 sm:px-6">
        {cards.length === 0 ? (
          <div className="flex min-h-[48vh] flex-col items-end justify-center">
            <h1 className="max-w-xl self-start font-sans text-4xl leading-[1.1] font-medium tracking-tight text-paper sm:text-6xl">
              The room, as cards.
            </h1>
            <p className="mt-4 max-w-md self-start text-[15px] leading-relaxed text-mute">
              Paste LinkedIn, X, Instagram, GitHub, or any link. Everyone in the Luma chat can find you on this wall.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="pt-16 font-sans text-sm text-mute">Nothing matches that search.</p>
        ) : (
          <div className="wall">
            <AnimatePresence initial={false}>
              {visible.map((card) => (
                <ContactCardView
                  key={card.id}
                  card={card}
                  mine={Boolean(tokens[card.id])}
                  onOpen={() => setOpen(card)}
                  onCopy={() => copy(card.url)}
                  onDelete={() => remove(card)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <form
        onSubmit={dropCard}
        className="fixed right-3 bottom-3 left-3 z-40 mx-auto max-w-2xl rounded-[1.75rem] border border-white/10 bg-ink/85 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:right-auto sm:left-1/2 sm:w-[min(42rem,calc(100%-1.5rem))] sm:-translate-x-1/2"
      >
        {shownPreview || waitingOnLink ? (
          <div className="mb-2 flex items-center gap-3 rounded-[1.25rem] bg-ink-2 px-3 py-2">
            {shownPreview?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPreview.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-1 text-mute">
                {waitingOnLink ? <SpinnerGap size={16} className="animate-spin" /> : <LinkSimple size={16} />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm text-paper">{shownPreview?.name || "Reading link…"}</p>
              <p className="truncate font-mono text-[10px] text-mute">{shownPreview?.handle || url}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a profile link"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            className="h-12 min-w-0 flex-1 rounded-full bg-transparent px-4 font-sans text-sm text-paper outline-none placeholder:text-mute"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-12 w-full rounded-full bg-ink-2 px-4 font-sans text-sm text-paper outline-none placeholder:text-mute sm:w-40"
          />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What you are working on (optional)"
            maxLength={140}
            className="h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 font-sans text-sm text-paper outline-none placeholder:text-mute"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-sand px-5 font-sans text-sm font-medium text-ink transition hover:bg-sand-2 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Dropping" : "Drop card"}
          </button>
        </div>
        {error ? <p className="px-4 pt-1 pb-1 font-mono text-[11px] text-sand">{error}</p> : null}
      </form>

      <Lightbox
        card={open}
        mine={Boolean(open && tokens[open.id])}
        onClose={() => setOpen(null)}
        onCopy={() => open && copy(open.url)}
        onDelete={open ? () => remove(open) : undefined}
      />

      <AnimatePresence>
        {toast ? (
          <div className="pointer-events-none fixed top-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-paper px-4 py-2 font-sans text-sm text-ink shadow-lg">
            {toast}
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
