"use client";

import {
  ArrowUpRight,
  Copy,
  GithubLogo,
  Globe,
  InstagramLogo,
  LinkedinLogo,
  Trash,
  XLogo,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { PLATFORM_META } from "@/lib/platforms";
import type { Platform, PublicCard } from "@/lib/types";

function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  const props = { size, weight: "regular" as const };
  if (platform === "linkedin") return <LinkedinLogo {...props} />;
  if (platform === "x") return <XLogo {...props} />;
  if (platform === "instagram") return <InstagramLogo {...props} />;
  if (platform === "github") return <GithubLogo {...props} />;
  return <Globe {...props} />;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ContactCardView({
  card,
  mine,
  onOpen,
  onCopy,
  onDelete,
}: {
  card: PublicCard;
  mine: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}) {
  const meta = PLATFORM_META[card.platform];
  const media = card.image;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="card-shell mb-4 break-inside-avoid"
    >
      <button
        type="button"
        onClick={onOpen}
        className="card-inner group w-full text-left"
      >
        {media ? (
          <div className="relative overflow-hidden rounded-[1.05rem] bg-ink-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media}
              alt=""
              className="aspect-[4/3] w-full object-cover transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="flex aspect-[5/3] items-end rounded-[1.05rem] bg-ink-2 px-4 py-4">
            <span className="font-sans text-4xl font-medium tracking-tight text-paper/90">
              {initials(card.name)}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-sans text-[15px] font-medium tracking-tight text-paper">
              {card.name}
            </h2>
            {card.handle ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-mute">
                {card.handle.startsWith("@") ? card.handle : card.handle}
              </p>
            ) : null}
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] tracking-wide text-ink"
            style={{ background: meta.tint }}
          >
            <PlatformIcon platform={card.platform} size={12} />
            {meta.label}
          </span>
        </div>

        {card.note ? (
          <p className="mt-3 text-[13px] leading-relaxed text-paper/80">{card.note}</p>
        ) : card.description ? (
          <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-mute">
            {card.description}
          </p>
        ) : null}
      </button>

      <div className="mt-3 flex items-center gap-1">
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] text-mute transition hover:bg-white/10 hover:text-paper"
        >
          Open
          <ArrowUpRight size={12} />
        </a>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] text-mute transition hover:bg-white/10 hover:text-paper"
        >
          <Copy size={12} />
          Copy
        </button>
        {mine && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] text-mute transition hover:bg-white/10 hover:text-paper"
          >
            <Trash size={12} />
            Remove
          </button>
        ) : null}
      </div>
    </motion.article>
  );
}

export { PlatformIcon, initials };
