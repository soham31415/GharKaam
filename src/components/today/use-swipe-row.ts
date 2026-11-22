"use client";

import { useRef } from "react";

export type SwipeOutcome = "done" | "skipped";

/**
 * Swipe a row right for Done, left for Skip (touch and pen only; buttons stay
 * the main way). The row follows the finger 1:1, the outcome is decided on
 * release by distance or a quick flick, otherwise it springs back.
 *
 * Writes transforms straight to the element (no React state per frame).
 */
export function useSwipeRow({ enabled, onCommit }: { enabled: boolean; onCommit: (outcome: SwipeOutcome) => void }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    startX: number;
    startY: number;
    startT: number;
    originX: number;
    dx: number;
    dragging: boolean;
    armed: boolean;
    cancelled: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  const threshold = (width: number) => Math.min(width * 0.35, 140);

  const setTrack = (dir: "done" | "skip" | null, armed: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    if (dir) track.dataset.swipe = dir;
    else delete track.dataset.swipe;
    if (armed) track.dataset.armed = "";
    else delete track.dataset.armed;
  };

  const release = (commit: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    const el = surfaceRef.current;
    if (!g || !g.dragging || !el) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 300); // browsers don't always send that click
    const width = el.offsetWidth;
    const elapsed = Math.max(1, performance.now() - g.startT);
    const velocity = Math.abs(g.dx) / elapsed; // px per ms
    const passed = Math.abs(g.dx) >= threshold(width) || (velocity > 0.5 && Math.abs(g.dx) > 60);
    el.style.transition = "transform 220ms var(--ease-out)";
    if (commit && passed) {
      const dir = g.dx > 0 ? 1 : -1;
      el.style.transform = `translate3d(${dir * width}px,0,0)`;
      onCommit(dir > 0 ? "done" : "skipped");
    } else {
      el.style.transform = "";
      const done = () => {
        setTrack(null, false);
        el.removeEventListener("transitionend", done);
      };
      el.addEventListener("transitionend", done);
    }
  };

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (!enabled || e.pointerType === "mouse" || gesture.current) return; // one finger at a time
      gesture.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startT: performance.now(),
        originX: e.clientX,
        dx: 0,
        dragging: false,
        armed: false,
        cancelled: false,
      };
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const g = gesture.current;
      const el = surfaceRef.current;
      if (!g || g.id !== e.pointerId || g.cancelled || !el) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.dragging) {
        // Let vertical scrolling win unless the finger clearly moves sideways.
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
          g.cancelled = true;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        g.dragging = true;
        g.originX = e.clientX; // start moving from here, so the row doesn't jump by the slop distance
        g.startT = performance.now();
        el.setPointerCapture(e.pointerId);
        el.style.transition = "none";
      }
      g.dx = e.clientX - g.originX;
      el.style.transform = `translate3d(${g.dx}px,0,0)`;
      const armed = Math.abs(g.dx) >= threshold(el.offsetWidth);
      if (armed && !g.armed) navigator.vibrate?.(8);
      g.armed = armed;
      setTrack(g.dx > 0 ? "done" : g.dx < 0 ? "skip" : null, armed);
    },
    onPointerUp() {
      release(true);
    },
    onPointerCancel() {
      release(false);
    },
    onClickCapture(e: React.MouseEvent) {
      // A swipe ends with a click on whatever was under the finger; don't follow the link.
      if (suppressClick.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick.current = false;
      }
    },
  };

  return { surfaceRef, trackRef, handlers };
}
