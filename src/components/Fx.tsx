"use client";
import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drifting data motes and falling telemetry streaks behind the hero.
 * Canvas is sized from its own box, device pixel ratio is capped, particle
 * count scales with viewport area, and the loop stops while the tab is
 * hidden so a phone in a pocket burns nothing.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      frame = 0,
      running = true;
    let motes: { x: number; y: number; z: number; vx: number; vy: number; r: number }[] = [];
    let streaks: { x: number; y: number; len: number; v: number }[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(120, Math.max(18, Math.round((w * h) / (w < 700 ? 9500 : 5600))));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.2,
        r: 0.5 + Math.random() * 1.3,
      }));
      streaks = Array.from({ length: w < 700 ? 3 : 7 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 40 + Math.random() * 130,
        v: 0.6 + Math.random() * 1.8,
      }));
    };
    const draw = () => {
      if (!running) return;
      frame = requestAnimationFrame(draw);
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -6) {
          m.y = h + 6;
          m.x = Math.random() * w;
        }
        if (m.x < -6) m.x = w + 6;
        else if (m.x > w + 6) m.x = -6;
        ctx.beginPath();
        ctx.fillStyle = `rgba(150,230,255,${(0.1 + m.z * 0.38).toFixed(3)})`;
        ctx.arc(m.x, m.y, m.r * (0.6 + m.z), 0, 6.2832);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      for (const s of streaks) {
        s.y += s.v;
        if (s.y - s.len > h) {
          s.y = -s.len;
          s.x = Math.random() * w;
          s.v = 0.6 + Math.random() * 1.8;
        }
        const g = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
        g.addColorStop(0, "rgba(0,229,255,0)");
        g.addColorStop(1, "rgba(0,229,255,0.28)");
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.len);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
    };
    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = () => {
      running = !document.hidden;
      if (running) draw();
      else cancelAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return <canvas ref={ref} className="particle-field" aria-hidden="true" />;
}

/**
 * Publishes a damped pointer position as --px/--py so the scene, the copy
 * and the overlays can drift at different depths. Pointer only: touch
 * devices keep the static composition.
 */
export function PointerParallax() {
  useEffect(() => {
    if (reduced() || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0,
      tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      const style = document.documentElement.style;
      style.setProperty("--px", cx.toFixed(4));
      style.setProperty("--py", cy.toFixed(4));
      raf =
        Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001
          ? requestAnimationFrame(tick)
          : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty("--px");
      document.documentElement.style.removeProperty("--py");
    };
  }, []);
  return null;
}

/** Pointer-following tilt for the sector cards, one delegated listener. */
export function CardTilt({ selector }: { selector: string }) {
  useEffect(() => {
    if (reduced() || !window.matchMedia("(hover: hover)").matches) return;
    const grid = document.querySelector(selector) as HTMLElement | null;
    if (!grid) return;
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".sector-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      card.style.setProperty("--ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const leave = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".sector-card");
      if (!card) return;
      card.style.setProperty("--tx", "0");
      card.style.setProperty("--ty", "0");
    };
    grid.addEventListener("pointermove", move, { passive: true });
    grid.addEventListener("pointerout", leave, { passive: true });
    return () => {
      grid.removeEventListener("pointermove", move);
      grid.removeEventListener("pointerout", leave);
    };
  }, [selector]);
  return null;
}

/** Reveals [data-reveal] elements as they scroll in, re-armed per screen. */
export function RevealOnScroll({ screen }: { screen: string }) {
  useEffect(() => {
    // Opt the document in before anything is hidden: without this class the
    // reveal styles never apply and the content renders plainly.
    document.documentElement.classList.add("fx-ready");
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!nodes.length) return;
    if (reduced() || typeof IntersectionObserver === "undefined") {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [screen]);
  return null;
}

/** Decodes text into place, character by character. */
export function Scramble({ text }: { text: string }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (reduced()) {
      setOut(text);
      return;
    }
    const glyphs = "▚▞█▌▐01<>/\\#*$%&ABCDEFGHJKLMNPQRSTUVWXYZ";
    let step = 0,
      raf = 0,
      last = 0;
    const run = (now: number) => {
      if (now - last > 38) {
        last = now;
        step += 1;
        const shown = Math.floor(step / 1.6);
        if (shown >= text.length) {
          setOut(text);
          return;
        }
        setOut(
          text
            .split("")
            .map((c, i) =>
              i < shown || c === " " ? c : glyphs[(Math.random() * glyphs.length) | 0],
            )
            .join(""),
        );
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return <>{out}</>;
}

/**
 * Physical response to a server verdict: the puzzle panel recoils on a
 * rejection, and a one-shot overlay flashes the result colour. Uses the
 * Web Animations API so repeated verdicts always replay.
 */
export function useImpact(feedback: { ok: boolean } | null, token: number) {
  useEffect(() => {
    if (!feedback || !token || reduced()) return;
    const panel = document.querySelector<HTMLElement>(
      ".room-layout, .identify-page, .facility-layout",
    );
    if (!panel?.animate) return;
    if (feedback.ok)
      panel.animate(
        [{ scale: "1" }, { scale: "1.012" }, { scale: "1" }],
        { duration: 420, easing: "ease-out" },
      );
    else
      panel.animate(
        [
          { translate: "0 0" },
          { translate: "-8px 2px" },
          { translate: "7px -2px" },
          { translate: "-4px 1px" },
          { translate: "0 0" },
        ],
        { duration: 400, easing: "ease-out" },
      );
  }, [feedback, token]);
}
