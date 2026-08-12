"use client";

import { ArrowUpRight, Copy, Trash, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PLATFORM_META } from "@/lib/platforms";
import type { PublicCard } from "@/lib/types";
import { initials, PlatformIcon } from "./contact-card";

export function Lightbox({
  card,
  mine,
  onClose,
  onCopy,
  onDelete,
}: {
  card: PublicCard | null;
  mine: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {card ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-md" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-title"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            {card.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image} alt="" className="h-56 w-full object-cover sm:h-72" />
            ) : (
              <div className="flex h-40 items-end bg-ink-2 px-6 py-5">
                <span className="font-sans text-6xl font-medium tracking-tight text-paper">
                  {initials(card.name)}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/50 text-paper backdrop-blur-sm"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="card-title" className="font-sans text-2xl font-medium tracking-tight text-paper">
                    {card.name}
                  </h2>
                  {card.handle ? (
                    <p className="mt-1 font-mono text-xs text-mute">{card.handle}</p>
                  ) : null}
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] text-ink"
                  style={{ background: PLATFORM_META[card.platform].tint }}
                >
                  <PlatformIcon platform={card.platform} size={12} />
                  {PLATFORM_META[card.platform].label}
                </span>
              </div>

              {card.note ? (
                <p className="mt-4 text-[15px] leading-relaxed text-paper/85">{card.note}</p>
              ) : null}
              {card.description && card.description !== card.note ? (
                <p className="mt-3 text-[13px] leading-relaxed text-mute">{card.description}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-sand px-5 font-sans text-sm font-medium text-ink transition hover:bg-sand-2 active:scale-[0.98]"
                >
                  Connect
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10">
                    <ArrowUpRight size={13} />
                  </span>
                </a>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 font-sans text-sm text-paper transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <Copy size={14} />
                  Copy link
                </button>
                {mine && onDelete ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex h-11 items-center gap-2 rounded-full px-4 font-sans text-sm text-mute transition hover:bg-white/10 hover:text-paper"
                  >
                    <Trash size={14} />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
