"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Page } from "@/components/independent/ui";

/**
 * The job-type cards' illustrations, each with a hover twin. The twins are drawn 1.05× (a 298.2-wide
 * viewBox) but fitted into the same 284-wide box, so they render at the normal size: the card's own
 * zoom is what grows them.
 */
const CARDS = [
  {
    kind: "trial",
    title: "Test Independents",
    body: "Run a paid, short-term trial on real work to evaluate performance and fit before committing to a full-time hire.",
    art: "/team/test-independents.svg",
    hover: "/team/test-independents-hover.svg",
    w: 284,
    h: 153.76,
    top: -12.26,
    ring: "group-hover:border-brand-orange group-focus-visible:border-brand-orange",
    glow: "radial-gradient(321px at 50% 50%, rgba(255,255,255,0) 40%, rgba(255,221,191,.5) 70%, rgba(255,187,126,1) 100%)",
  },
  {
    kind: "full-time",
    title: "Build Team",
    body: "Hire for a long-term role, full-time or part-time, with defined responsibilities and room for growth.",
    art: "/team/build-team.svg",
    hover: "/team/build-team-hover.svg",
    w: 284,
    h: 181,
    top: -12.5,
    ring: "group-hover:border-primary group-focus-visible:border-primary",
    glow: "radial-gradient(321px at 50% 50%, rgba(255,255,255,0) 40%, rgba(158,223,255,.5) 70%, rgba(110,208,255,.75) 85%, rgba(61,192,255,1) 100%)",
  },
] as const;

/**
 * The two kinds of job post, as 320px cards that zoom to 336 on hover. Keyboard focus gets the
 * same look.
 *
 * A transform zoom draws the card once and stretches that image while it animates, then redraws it
 * sharp when the animation stops — and that redraw is what made the copy jump just after every zoom
 * in and zoom out (the fades inside the card force it; "Post a Job" hid it only because it was
 * fading at those moments). So the copy and the button sit on layers of their own for good
 * (will-change): nothing redraws them, and they only ever scale. Zooming by layout instead — the
 * sizes themselves growing — re-snapped the text to the pixel grid on every frame, and it shook.
 */
export default function CreateRole() {
  const row = useWholePixels();
  return (
    <Page title="Create Role" padded={false}>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-20">
        <div className="flex w-[544px] flex-col gap-2 text-center leading-[1.5]">
          <h2 className="font-display text-[32px] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            What type of role are you creating?
          </h2>
          <p className="text-[16px] tracking-[0.2px] text-ink-2">Choose how you want to start working together.</p>
        </div>
        <div ref={row} className="relative flex items-center">
          {CARDS.map((c, i) => (
            <Link key={c.kind} href={`/team/hire/new?type=${c.kind}`} className={`group flex size-[380px] items-center justify-center outline-none ${i === 0 ? "-mr-[30px]" : ""}`}>
              <span
                className={`relative flex size-[320px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-4 transition duration-300 ease-out group-hover:scale-105 group-hover:shadow-[0_6px_8px_rgba(0,0,0,.10)] group-focus-visible:scale-105 group-focus-visible:shadow-[0_6px_8px_rgba(0,0,0,.10)] ${c.ring}`}
              >
                <span aria-hidden className="absolute inset-0 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100" style={{ backgroundImage: c.glow }} />
                <span className="relative h-24 w-[284px]">
                  <Image src={c.art} alt="" width={c.w} height={c.h} className="absolute left-0 max-w-none transition duration-300 ease-out group-hover:opacity-0 group-focus-visible:opacity-0" style={{ top: c.top, width: c.w, height: c.h }} />
                  <Image src={c.hover} alt="" width={c.w} height={c.h} className="absolute left-0 max-w-none opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100" style={{ top: c.top, width: c.w, height: c.h }} />
                </span>
                {/* Own layer for good: scaled, never redrawn, so it can't jump. Sized in whole pixels
                    (17px lines, an 80px block) so centring puts it on one — see useWholePixels. */}
                {/* react-doctor-disable-next-line react-doctor/no-permanent-will-change -- a layer for good is the fix: see the note above CreateRole */}
                <span className="relative flex h-20 w-full flex-col gap-1 text-center tracking-[0.2px] will-change-transform">
                  <span className="text-[16px] leading-[1.5] font-semibold text-ink">{c.title}</span>
                  <span className="text-[14px] leading-[17px] text-ink-2">{c.body}</span>
                </span>
                {/* react-doctor-disable-next-line react-doctor/no-permanent-will-change -- a layer for good is the fix: see the note above CreateRole */}
                <span className="relative flex h-10 w-[108px] items-center justify-center rounded-lg border border-border bg-white text-[14px] font-medium text-ink opacity-0 transition-opacity duration-300 ease-out will-change-transform group-hover:opacity-100 group-focus-visible:opacity-100">
                  Post a Job
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}

/**
 * Puts the row of cards on whole device pixels. Centring it on the page gives half pixels whenever
 * the window is an odd size, and a layer the browser draws at a fractional spot is rounded one way
 * while the zoom runs and another once it's still — the copy hopped a pixel as the zoom-out ended.
 * Inside the cards every offset is whole by construction, so only the row needs placing.
 *
 * Placed with `top` / `left` on a relatively positioned row: a layout offset. A fractional
 * `translate` here was itself what got rounded differently during the zoom.
 */
function useWholePixels() {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const place = () => {
      el.style.left = "0px";
      el.style.top = "0px";
      const dpr = window.devicePixelRatio || 1;
      const r = el.getBoundingClientRect();
      el.style.left = `${Math.round(r.left * dpr) / dpr - r.left}px`;
      el.style.top = `${Math.round(r.top * dpr) / dpr - r.top}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);
  return row;
}
