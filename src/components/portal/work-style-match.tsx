"use client";

import { StatusDot } from "@/components/portal/ui";
import type { Tone } from "@/lib/portal/tone";
import { TraitTag } from "@/components/portal/trait-tag";
import { traitFit, traitTagsFor, WORK_STYLE_TRAITS } from "@/lib/demo/work-style";
import type { TraitFit } from "@/lib/demo/work-style";

const FIT: Record<TraitFit, { tone: Tone; label: string }> = {
  same: { tone: "ok", label: "In sync" },
  close: { tone: "info", label: "Close" },
  apart: { tone: "neutral", label: "Different" },
};

/**
 * Rows sized by the room they have (a container query, so the job page's wide column and the
 * application page's narrow one both read well): their badge, yours and the fit in columns once
 * there's space for two badges side by side, with the trait's name first where there's more;
 * narrower, the two badges and the fit simply flow along the line.
 */
const COLS = "@min-[480px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px] @min-[660px]:grid-cols-[minmax(96px,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_88px]";
const ROW = `flex flex-wrap items-center gap-x-3 gap-y-2 px-4 @min-[480px]:grid ${COLS}`;
/** Column labels only once the badges sit in columns; narrower, the footnote says whose comes first. */
const HEAD = `hidden items-center gap-x-3 px-4 @min-[480px]:grid ${COLS}`;

/**
 * IN-012 — how the talent's work style lines up with a company's, in the Workplace Tags both quizzes
 * gave them. It stands where the work-style chart used to (Team Builder and Independent bubbles
 * overlapping trait by trait): a row per trait with the company's badge beside the talent's, and
 * whether they answered the same way. Nothing to compare until the company has taken its quiz;
 * before the talent has taken theirs, the company's badges show on their own.
 */
export function WorkStyleMatch({ company, theirs, mine }: { company: string; theirs: readonly number[]; mine: readonly number[] }) {
  const theirTags = traitTagsFor(theirs, "team");
  const myTags = traitTagsFor(mine, "independent");
  if (!theirTags.length) return <p className="text-[14px] leading-[1.4] text-ink-2">{company} hasn&apos;t taken the work-style quiz yet, so there&apos;s nothing to compare.</p>;
  if (!myTags.length)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {theirTags.map((t) => (
            <TraitTag key={`${t.trait}-${t.label}`} tag={t} view="other" />
          ))}
        </div>
        <p className="text-[13px] leading-[1.4] text-ink-2">How {company} works. Take the work-style quiz to see where you line up.</p>
      </div>
    );

  const rows = WORK_STYLE_TRAITS.map((trait, i) => ({ trait, them: theirTags.find((t) => t.trait === i), you: myTags.find((t) => t.trait === i), fit: traitFit(theirs[i], mine[i]) }));
  const count = (fit: TraitFit) => rows.filter((r) => r.fit === fit).length;
  return (
    <div className="@container flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[14px] leading-[1.4] text-ink-2">How you line up with {company}, trait by trait:</p>
        <span className="flex flex-wrap gap-1.5">
          {(Object.keys(FIT) as TraitFit[]).map((fit) => (
            <StatusDot key={fit} tone={FIT[fit].tone}>
              {count(fit)} {FIT[fit].label.toLowerCase()}
            </StatusDot>
          ))}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
        <div className={`${HEAD} bg-surface-2 py-2 text-[12.5px] leading-[1.4] font-medium text-ink-2`}>
          <span className="hidden @min-[660px]:block">Trait</span>
          <span className="truncate">{company}</span>
          <span>You</span>
          <span className="sr-only">Fit</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.trait} className={`${ROW} py-2.5 ${i ? "border-t border-[#eeeeee]" : "@min-[480px]:border-t @min-[480px]:border-[#eeeeee]"}`}>
            <span className="hidden text-[13px] leading-[1.3] font-medium text-ink @min-[660px]:block">{r.trait}</span>
            <span className="min-w-0">{r.them ? <TraitTag tag={r.them} view="other" /> : <span className="text-ink-2">—</span>}</span>
            <span className="min-w-0">{r.you ? <TraitTag tag={r.you} view="self" /> : <span className="text-ink-2">—</span>}</span>
            <span className="ml-auto @min-[480px]:ml-0">{r.fit && <StatusDot tone={FIT[r.fit].tone}>{FIT[r.fit].label}</StatusDot>}</span>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-[1.4] text-ink-2">From both work-style quizzes: {company}&apos;s badge, then yours. Hover a badge to see what it means.</p>
    </div>
  );
}
