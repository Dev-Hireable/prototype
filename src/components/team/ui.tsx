"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Avatar, Button, Chip, Drawer, LinkButton, MatchPill, Toast } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import { TalentProfile, type TalentProfileData } from "@/components/portal/talent-profile";
import { contractTypeOf, evaluationsOf, pastEvaluations, useDeal, type Deal, type PastEvaluation } from "@/lib/demo/deal";
import { useIntroVideo } from "@/lib/demo/intro";
import { PAIR } from "@/lib/demo/live";
import { traitTagsFor } from "@/lib/demo/work-style";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { useToast } from "@/lib/portal/toast";
import { pipelineHref } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useSavedTalent } from "@/lib/team/saved";
import { usePipeline } from "@/lib/team/pipeline";

export function IndependentCard({
  person,
  variant = "discover",
  onInvite,
  onOpen,
  onRemove,
}: {
  person: Independent;
  variant?: "discover" | "saved";
  onInvite: () => void;
  onOpen?: (p: Independent) => void;
  /** Saved list only — TB-022 routes this through a confirmation prompt. */
  onRemove?: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-border">
      <div className="flex items-center gap-3">
        <Avatar src={person.avatar} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {onOpen ? (
            <button type="button" onClick={() => onOpen(person)} className="self-start text-[14px] leading-[1.4] font-medium text-primary hover:underline">
              {person.name}
            </button>
          ) : (
            <Link href={`/team/discover/${person.slug}`} className="text-[14px] leading-[1.4] font-medium text-primary hover:underline">
              {person.name}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[18px] leading-[1.4] font-semibold text-ink">{person.role}</span>
            <MatchPill pct={person.match} coded title={MATCH_TOOLTIP.team} />
          </div>
        </div>
        <IndependentCardActions person={person} variant={variant} onInvite={onInvite} onRemove={onRemove} />
      </div>
      <p className="text-[14px] leading-[1.4] text-ink-2">
        {person.rate} · {person.level} · {person.location}
      </p>
      <div className="flex flex-wrap gap-2">
        {person.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </article>
  );
}

/**
 * The card's actions: Remove on the saved list, or the save toggle on Discover — then Invite to
 * apply, or their column on the role's board once they're a candidate.
 */
function IndependentCardActions({ person, variant, onInvite, onRemove }: { person: Independent; variant: "discover" | "saved"; onInvite: () => void; onRemove?: () => void }) {
  const { pipelineOf } = usePipeline();
  const { saved, toggleSaved } = useSavedTalent();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {variant === "saved" ? (
        <Button size="sm" variant="danger" onClick={() => (onRemove ? onRemove() : toggleSaved(person.slug))}>
          Remove
        </Button>
      ) : (
        <button
          type="button"
          aria-label={isSaved ? "Unsave independent" : "Save independent"}
          aria-pressed={isSaved}
          onClick={() => toggleSaved(person.slug)}
          className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary"
        >
          <Mark size={16} aria-hidden />
        </button>
      )}
      {/* Already a candidate: open their column on the role's board rather than a dead button. */}
      {inPipeline ? (
        <LinkButton size="sm" href={withReturn(pipelineHref(inPipeline))}>
          View in pipeline
        </LinkButton>
      ) : (
        <Button size="sm" variant="primary" onClick={onInvite}>
          Invite to apply
        </Button>
      )}
    </div>
  );
}

/**
 * An independent's profile preview, drawn as the same Contra-style profile as
 * the full page and the talent's own view, in a sheet that slides in: the hero (Invite / Save, the
 * facts, the intro) and the tabs are all here, with the full page one click away beside the photo.
 */
export function ProfileDrawer({ person, onClose, onInvite }: { person: Independent | null; onClose: () => void; onInvite: (p: Independent) => void }) {
  const withReturn = useWithReturn();
  /** The one on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [last, setLast] = useState(person);
  if (person && person.slug !== last?.slug) setLast(person);
  const p = person ?? last;
  const [toast, setToast] = useToast();
  const Out = ICONS.northEast;
  return (
    <>
      <Drawer open={!!person} onClose={onClose} title="Independent profile">
        {p && (
          <TeamProfile
            person={p}
            onInvite={() => onInvite(p)}
            onPlayIntro={() => setToast("Intro video plays here", "info")}
            inSheet
            // A plain ink link by the photo, not a button or the brand blue: it leaves the preview for the full page.
            // No underline on hover — the arrow nudges the way it points instead.
            photoAction={
              <Link
                href={withReturn(`/team/discover/${p.slug}`)}
                className="group inline-flex items-center gap-1 rounded-sm text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View profile
                <Out
                  size={16}
                  aria-hidden
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transition-none"
                />
              </Link>
            }
          />
        )}
      </Drawer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** The live pair's evaluations: the live engagement's first, then the ones from before it. */
function pairHistory(deal: Deal | null): PastEvaluation[] {
  return [
    ...(deal ? evaluationsOf(deal.contract).map((e) => ({ company: deal.company, role: deal.title, type: contractTypeOf(deal), date: e.date, stars: e.stars, feedback: e.feedback })) : []),
    ...pastEvaluations,
  ];
}

/** The Team Builder's record of a talent, as TalentProfile draws it — with the intro video and history only the live pair has. */
function profileData(person: Independent, introVideo: string | undefined, history: PastEvaluation[]): TalentProfileData {
  return {
    name: person.name,
    headline: person.role,
    photo: person.avatar,
    intro: person.intro,
    introVideo,
    rate: person.rate,
    level: person.level,
    location: person.location,
    bio: person.bio,
    skills: person.skills,
    tags: traitTagsFor(person.workStyle.independent, "independent"),
    links: person.links ?? { linkedin: "", portfolio: "", website: "" },
    history,
  };
}

/**
 * A talent's profile as a Team Builder reads it (IN-060): the talent's own TalentProfile, with the
 * match beside the name and Invite to apply / Save as the actions. Their work style is the Workplace
 * Tags under About. The Discover page draws it full width; the preview sheet keeps its tab to itself;
 * a role's candidate page puts its stage buttons in the hero and its pipeline in the aside.
 */
export function TeamProfile({
  person,
  onInvite,
  onPlayIntro,
  inSheet = false,
  actions,
  note,
  aside,
  photoAction,
}: {
  person: Independent;
  /** Discover's Invite to apply. */
  onInvite?: () => void;
  onPlayIntro: () => void;
  inSheet?: boolean;
  /** In place of Invite to apply / Save: the candidate page's next step for the candidate. */
  actions?: ReactNode;
  /** A line under the actions, e.g. what the candidate page is waiting on. */
  note?: ReactNode;
  /** A column under the intro, beside the tab's content (TalentProfile). */
  aside?: ReactNode;
  /** Beside the photo: the preview sheet's View profile link. */
  photoAction?: ReactNode;
}) {
  const deal = useDeal();
  const pair = person.slug === PAIR.independent.slug;
  /** The intro video the live pair added to their own profile, which plays here too. */
  const introVideo = useIntroVideo();
  /** The live pair's evaluations are the ones the talent's own profile lists; nobody else has any on Hireable yet. */
  const history = pair ? pairHistory(deal) : [];
  return (
    <TalentProfile
      viewer="team"
      person={profileData(person, pair ? (introVideo ?? undefined) : undefined, history)}
      // The same gradient match pill as the Discover cards, at the header's size.
      badge={<MatchPill pct={person.match} title={MATCH_TOOLTIP.team} size="lg" />}
      actions={actions ?? <TeamProfileActions person={person} onInvite={onInvite} />}
      note={note}
      onPlayIntro={onPlayIntro}
      aside={aside}
      photoAction={photoAction}
      tabInUrl={!inSheet}
    />
  );
}

/** Invite to apply — or their column on the role's board once they're a candidate — and Save. */
function TeamProfileActions({ person, onInvite }: { person: Independent; onInvite?: () => void }) {
  const { pipelineOf } = usePipeline();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  return (
    <>
      {inPipeline ? (
        <LinkButton variant="primary" href={withReturn(pipelineHref(inPipeline))}>
          View in pipeline
        </LinkButton>
      ) : (
        <Button variant="primary" onClick={onInvite}>
          Invite to apply
        </Button>
      )}
      <SaveButton person={person} />
    </>
  );
}

/** Save / Saved beside a profile's other actions. */
export function SaveButton({ person }: { person: Independent }) {
  const { saved, toggleSaved } = useSavedTalent();
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <Button onClick={() => toggleSaved(person.slug)}>
      <Mark size={18} aria-hidden className={isSaved ? "text-primary" : "text-ink-2"} />
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
