import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isoDay } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { postedStart } from "@/lib/demo/job-types";
import type { TaskSuggestion } from "@/lib/demo/suggestions";
import { useIndependentAccount } from "@/lib/independent/account";
import { useApplications } from "@/lib/independent/applications";
import { useJobView } from "@/lib/independent/job-view";
import { useToast } from "@/lib/portal/toast";
import type { Terms } from "./proposal";

/** A saved draft. Drafts saved while proposals still listed tasks keep them too; they're ignored. */
type Draft = { rate: string; letter: string; portfolio: string; hours?: string; start?: string };
const draftKey = (roleSlug: string) => `hireable.demo.ind.proposalDraft.${roleSlug}`;
/** Portal pages render after hydration, so the draft can be read straight into the first render. */
function loadDraft(roleSlug: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(roleSlug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/** A sent proposal as a draft to revise. */
const draftOf = (p: DealProposal): Draft => ({ rate: String(rateAmount(p.rate)), letter: p.letter, portfolio: p.portfolio ?? "", hours: p.hours ? String(p.hours) : undefined, start: p.start });

/**
 * The wizard's fields. A saved draft wins over a blank form; a revision starts from the version
 * that was sent. `save` keeps where the talent got to for next time; `discard` drops it once sent.
 */
function useProposalForm(roleSlug: string | undefined, revising: DealProposal | undefined, posted: { hours?: number; start: string }, portfolioLink: string | undefined) {
  const [initial] = useState<Draft | null>(() => (roleSlug ? loadDraft(roleSlug) : null));
  const seed = initial ?? (revising ? draftOf(revising) : null);
  const [rate, setRate] = useState(seed?.rate ?? "");
  const [hours, setHours] = useState(seed?.hours ?? (posted.hours ? String(posted.hours) : "20"));
  /** IN-072 — the day they'd start: the draft's or the version revised, or else the earliest the role allows. */
  const [start, setStart] = useState(seed?.start ?? posted.start);
  const [letter, setLetter] = useState(seed?.letter ?? "");
  const [portfolio, setPortfolio] = useState(seed?.portfolio ?? portfolioLink ?? "");
  const save = () => {
    try {
      if (roleSlug) localStorage.setItem(draftKey(roleSlug), JSON.stringify({ rate, letter, portfolio, hours, start } satisfies Draft));
    } catch {
      /* private mode — nothing to keep */
    }
  };
  const discard = () => {
    try {
      if (roleSlug) localStorage.removeItem(draftKey(roleSlug));
    } catch {
      /* ignore */
    }
  };
  return { fromDraft: !!initial, rate, setRate, hours, setHours, start, setStart, letter, setLetter, portfolio, setPortfolio, save, discard };
}

/**
 * What the wizard answers: the application and its job, the version a revision starts from, and
 * whether the page only shows the role's details (?review=1).
 */
function useProposalRequest(id: string) {
  const { applications, submitProposal } = useApplications();
  const app = applications.find((a) => a.id === id);
  const deal = useDeal();
  const search = useSearchParams();
  const job = useJobView(app ?? { id, roleSlug: "", title: "", company: "", match: 0, submitted: "", stage: "applied" });
  const live = app && deal?.roleSlug === app.roleSlug ? deal : null;
  /** A revision starts from what was actually sent, with the Team Builder's note above it. */
  const previous = live?.proposal;
  const revisionNote = live?.revision;
  const revise = search.get("revise") === "1" && !!revisionNote;
  const reviewOnly = search.get("review") === "1";
  return { app, job, live, previous, revising: revise ? previous : undefined, revise, reviewOnly, submitProposal };
}

/**
 * The wizard's state, kept in the page (Next keeps it mounted across `?review=1`, so a look at the
 * role loses nothing): the request it answers, the fields, the step, the suggested task changes,
 * and saving a draft or sending it. Not found when the application isn't the talent's.
 */
export function useProposalWizard(id: string) {
  const { profile } = useIndependentAccount();
  const { app, job, live, previous, revising, revise, reviewOnly, submitProposal } = useProposalRequest(id);
  const router = useRouter();
  // A trial can start today; an ongoing role from the start it was posted with.
  const form = useProposalForm(app?.roleSlug, revising, { hours: job.hours, start: isoDay(job.type === "trial" ? new Date() : postedStart(job.duration)) }, profile.links.portfolio);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  /** IN-073 — changes to the trial's tasks suggested with this revision; the company decides on each. */
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [toast, setToast] = useToast();
  if (!app) notFound();
  const back = `/independent/jobs/applications/${app.id}`;

  /**
   * IN-072 — a proposal answers a request. The wizard used to open at any stage by URL, and
   * submitting from it moved a signed — even ended — contract back to "Proposal submitted".
   */
  const open = app.stage === "proposal_requested";

  /** Saves where the talent got to; the draft comes back the next time the wizard opens. */
  const saveDraft = () => {
    form.save();
    setToast("Draft saved — it's here when you come back");
  };
  /**
   * Saved the moment it is submitted, not when the confirmation closes — leaving any other way
   * used to drop it, and the Team Builder reviewed a sample proposal instead of this one.
   */
  const submit = (terms: Terms) => {
    if (!submitProposal(app.id, terms)) return setToast("This proposal can't be sent — no proposal is requested right now", "danger");
    form.discard();
    setSent(true);
  };
  const author = { name: profile.name, avatar: profile.photo, role: profile.headline, match: app.match };
  return { app, job, live, previous, revise, reviewOnly, form, step, setStep, sent, suggestions, setSuggestions, toast, setToast, back, close: () => router.push(back), open, author, saveDraft, submit };
}

export type Wizard = ReturnType<typeof useProposalWizard>;
