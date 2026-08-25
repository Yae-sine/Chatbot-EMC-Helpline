"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** How far from the bottom still counts as "following the conversation". */
const NEAR_BOTTOM_PX = 96;

export interface StickToBottom<T extends HTMLElement> {
  scrollRef: RefObject<T | null>;
  atBottom: boolean;
  scrollToBottom: () => void;
}

/**
 * Follows new content only while the reader is already at the bottom.
 *
 * The previous implementation forced `scrollTop = scrollHeight` on every
 * change, which yanked the reader away mid-sentence whenever an answer arrived
 * while they were scrolled up re-reading an earlier one — the exact moment
 * someone is most likely to be re-reading emergency numbers.
 *
 * Following is deliberately instant. With CSS `scroll-smooth` on the container,
 * every animation frame fires a `scroll` event from a position that is not yet
 * at the bottom; the reader gets marked as "scrolled away" by the app's own
 * scroll and following stops for the rest of the conversation. Only the
 * explicit "back to latest" button animates, and only when motion is welcome.
 *
 * `watch` should change whenever the scrollable content changes.
 */
export function useStickToBottom<T extends HTMLElement>(watch: unknown): StickToBottom<T> {
  const scrollRef = useRef<T>(null);
  const [atBottom, setAtBottom] = useState(true);
  // Mirrored in a ref so the follow effect reads the live value without
  // re-subscribing on every scroll event.
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const smooth =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }

    atBottomRef.current = true;
    setAtBottom(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
      atBottomRef.current = near;
      setAtBottom(near);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [watch]);

  // Height can change without new messages: an avatar decoding, a webfont
  // swapping, the composer growing to five lines, the phone keyboard opening.
  // Re-pin through all of them while the reader is following.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  return { scrollRef, atBottom, scrollToBottom };
}
