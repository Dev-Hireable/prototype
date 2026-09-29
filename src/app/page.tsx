"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PORTALS = [
  { id: "team-builder", title: "Team Builder", accent: "var(--color-brand-pink)", href: "/team" },
  { id: "independent", title: "Independent", accent: "var(--color-brand-orange)", href: "/independent" },
  { id: "admin", title: "Admin", accent: "var(--color-brand-blue)", href: "/admin" },
] as const;

type Portal = (typeof PORTALS)[number];

export default function PortalSelection() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();
  const target = PORTALS.find((p) => p.id === selected)?.href ?? null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-3xl flex-col items-center">
        <Image
          src="/hireable-logo.svg"
          alt="Hireable"
          width={701}
          height={140}
          preload
          unoptimized
          className="h-8 w-auto"
        />

        <h1 className="mt-10 text-center text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Which portal do you want to see?
        </h1>

        <fieldset className="mt-12 w-full">
          <legend className="sr-only">Choose a portal</legend>
          <div className="grid gap-6 sm:grid-cols-3">
            {PORTALS.map((portal) => (
              <PortalOption key={portal.id} portal={portal} isSelected={selected === portal.id} onSelect={() => setSelected(portal.id)} />
            ))}
          </div>
        </fieldset>

        {/* Straight into a portal for the demo; the front door with accounts behind it is /login. */}
        <button
          type="button"
          disabled={!target}
          onClick={() => target && router.push(target)}
          className="mt-12 rounded-full bg-ink px-10 py-3.5 text-base font-semibold text-white transition
            hover:bg-black disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          Continue
        </button>

        <p className="mt-6 text-sm text-ink-2">
          Or{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4 hover:text-black">
            sign in with an account
          </Link>{" "}
          to land on the matching dashboard.
        </p>
      </div>
    </main>
  );
}

/** One portal as a card-sized radio: its name, in its accent colour with a tick once it's picked. */
function PortalOption({ portal, isSelected, onSelect }: { portal: Portal; isSelected: boolean; onSelect: () => void }) {
  return (
    <label
      style={{ ["--accent" as string]: portal.accent }}
      className={`relative flex cursor-pointer items-center justify-center rounded-2xl border-2 bg-white px-6 py-10 text-lg font-semibold transition
        focus-within:ring-4 focus-within:ring-[var(--accent)]/20
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5
        ${isSelected ? "border-[var(--accent)] text-[var(--accent)] shadow-lg shadow-black/5" : "border-black/10 text-ink"}`}
    >
      <input type="radio" name="portal" value={portal.id} checked={isSelected} onChange={onSelect} className="sr-only" />
      {portal.title}
      <span
        aria-hidden
        className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition
          ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-black/15"}`}
      >
        {isSelected && <span className="text-xs font-bold leading-none text-white">✓</span>}
      </span>
    </label>
  );
}
