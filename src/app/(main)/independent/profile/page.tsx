"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { BioEditor, HeroEditor, LinksEditor, SkillsEditor } from "@/components/independent/profile-editors";
import { SamplesEditor } from "@/components/independent/portfolio-editor";
import { Page, Toast } from "@/components/portal/ui";
import { EditButton } from "@/components/portal/inline-edit";
import { RetakeQuizDialog } from "@/components/portal/retake-quiz-dialog";
import { TalentProfile } from "@/components/portal/talent-profile";
import { Badge } from "@/components/portal/badge";
import { checkIntro, INTRO_TYPES, saveIntro, useIntroVideo } from "@/lib/demo/intro";
import { usePortfolio, type Sample } from "@/lib/demo/portfolio";
import { useNextRetake } from "@/lib/demo/retake";
import { dayLabel } from "@/lib/portal/dates";
import { pastEvaluations } from "@/lib/demo/deal";
import { ME, type Contract } from "@/lib/independent/data";
import { useIndependentAccount, type Profile as ProfileData } from "@/lib/independent/account";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast, type SetToast } from "@/lib/portal/toast";

const Eye = ICONS.visibility;
const AddVideo = ICONS.videoAdd;

/** What's open for editing. It's in the URL, so /independent/profile?edit=profile lands in the header's editor. */
const EDITS = ["none", "profile", "bio", "skills", "samples", "links"] as const;
type Edit = (typeof EDITS)[number];

/**
 * IN-060 — your profile exactly as Team Builders read it (the same TalentProfile their Discover page
 * and preview sheet draw), edited in place the way Create Role's Review is: the pencil next to a part
 * turns it into its fields with Cancel / Save, and the other pencils wait until that's done — no
 * modal, no separate page (IN-061, IN-062, IN-065). Your intro video is added from its own card.
 */
export default function Profile() {
  const { contracts } = useIndependentContracts();
  const { profile, setProfile, tags } = useIndependentAccount();
  const [editing, setEditing] = useQueryState<Edit>("edit", "none", EDITS);
  const done = () => setEditing("none");
  const [retake, setRetake] = useState(false);
  const [toast, setToast] = useToast();
  const introVideo = useIntroVideo();
  const samples = usePortfolio();
  const retakeOn = useNextRetake("independent");
  /** Closes the editor whose part was just saved and says what was. */
  const saved = (message: string) => {
    done();
    setToast(message);
  };
  /** Saves one part of the profile, closes its editor and says what was saved. */
  const save = (patch: Partial<ProfileData>, message: string) => {
    setProfile(patch);
    saved(message);
  };

  return (
    <Page title="Profile">
      <TalentProfile
        viewer="self"
        // As a Team Builder sees it before a hire: "Juan D." and no links (TalentProfile, not hired), and
        // the same intro card: the still every Team Builder view shows, or the talent's own video once added.
        person={{ ...profile, intro: ME.intro, introVideo: introVideo ?? undefined, tags, samples, history: historyOf(contracts) }}
        // The talent's "Pro", at the size of the gradient MatchPill a Team Builder sees in its place.
        badge={
          <Badge tone="ok" size="lg">
            Pro
          </Badge>
        }
        note={
          // IN-060 — this page is the Team Builder's view of you, not a separate internal one.
          <p className="flex items-center gap-1.5 text-[13px] leading-[1.4] text-ink-2">
            <Eye size={16} aria-hidden className="shrink-0" />
            This is exactly how Team Builders see your profile before they hire you.
          </p>
        }
        onPlayIntro={() => setToast("Intro video plays here", "info")}
        introAction={<IntroAction hasIntro={!!(introVideo || ME.intro)} onMessage={setToast} />}
        edit={pencilsFor(editing, { hasTags: tags.length > 0, retakeOn }, setEditing, () => setRetake(true))}
        editor={editorsFor(editing, { profile, samples }, { onCancel: done, onSave: save, onSaved: saved, onMessage: setToast })}
      />

      {/* IN-064 — confirm before restarting; the current tags stand until the new answers are in. */}
      <RetakeQuizDialog side="independent" open={retake} onClose={() => setRetake(false)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * IN-066 — every evaluation received, from live contracts first and closed engagements after.
 * Read-only: nothing here can be edited or removed from this side.
 */
function historyOf(contracts: Contract[]) {
  return [
    // Off the contracts themselves — this read an empty seed, so a submitted evaluation never showed.
    ...contracts.flatMap((c) => c.evaluations.map((e) => ({ company: c.company, role: c.title, type: c.type, date: e.date, stars: e.stars, feedback: e.feedback }))),
    ...pastEvaluations,
  ];
}

/** The talent's own Add / Replace intro over the intro card: it picks a video, checks it and saves it. */
function IntroAction({ hasIntro, onMessage }: { hasIntro: boolean; onMessage: SetToast }) {
  const introFile = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={introFile}
        type="file"
        accept={INTRO_TYPES.join(",")}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const problem = checkIntro(file);
          if (problem) return onMessage(problem, "danger");
          try {
            await saveIntro(file);
            onMessage(hasIntro ? "Intro video replaced" : "Intro video added");
          } catch {
            onMessage("That video couldn't be saved. Try a shorter one.", "danger");
          }
        }}
      />
      <button
        type="button"
        onClick={() => introFile.current?.click()}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white pr-3 pl-2 text-[13px] leading-none font-medium text-ink shadow-[0_2px_8px_rgba(0,0,0,.15)] transition hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <AddVideo size={18} aria-hidden className="text-primary" />
        {hasIntro ? "Replace intro" : "Add intro"}
      </button>
    </>
  );
}

/**
 * The pencil beside each part — none beside the part being edited, since its editor replaces it —
 * and the tags' own, which retakes the quiz. While any part is open the others wait.
 */
function pencilsFor(editing: Edit, { hasTags, retakeOn }: { hasTags: boolean; retakeOn: Date | null }, onEdit: (part: Edit) => void, onRetake: () => void) {
  /** Another part is open: Save or Cancel it first, as on Create Role's Review. */
  const locked = editing !== "none";
  /** The pencil next to a part (its own editor replaces the part, pencil and all). */
  const pencil = (label: string, part: Edit) => editing !== part && <EditButton label={label} onClick={() => onEdit(part)} disabled={locked} />;
  return {
    // IN-061 — photo, name, headline, where you are and your links, rate and experience.
    profile: pencil("profile details", "profile"),
    // IN-062 — the bio, 500 characters at most.
    bio: pencil("bio", "bio"),
    // IN-063 / IN-064 — the tags are display-only: the only way to change them is to retake the quiz, which is the
    // real app's onboarding (/onboarding/talent), after a confirmation.
    // Once a year: until the next retake comes round, the pencil waits and says when.
    tags: hasTags ? (
      <EditButton label="work style tags" tip="Retake the quiz to change your tags" onClick={onRetake} disabled={locked || !!retakeOn} reason={!locked && retakeOn ? `You can retake the quiz on ${dayLabel(retakeOn)}.` : undefined} />
    ) : (
      <EditButton label="work style tags" tip="Take the work-style quiz" href="/onboarding/talent" disabled={locked} />
    ),
    // IN-065 — Create Role's skill picker.
    skills: pencil("skills", "skills"),
    // #355 / #311 — the work samples Team Builders see before a hire, where the links stay hidden.
    samples: pencil("work samples", "samples"),
    portfolio: pencil("portfolio links", "links"),
  };
}

/** The open part's editor, in place of the part: Cancel closes it, and Save saves that part and says so. */
function editorsFor(
  editing: Edit,
  { profile, samples }: { profile: ProfileData; samples: Sample[] },
  { onCancel, onSave, onSaved, onMessage }: { onCancel: () => void; onSave: (patch: Partial<ProfileData>, message: string) => void; onSaved: (message: string) => void; onMessage: SetToast },
) {
  /**
   * An editor starts from the saved profile, which loads from storage just after mount; keying on it
   * re-seeds an editor opened straight from the URL, instead of leaving it on the seed.
   */
  const seed = [profile.name, profile.headline, profile.rate, profile.level, profile.location, profile.bio, profile.skills.join(","), profile.photo.length, Object.values(profile.links).join(",")].join("|");
  return {
    profile: editing === "profile" && <HeroEditor key={seed} profile={profile} onCancel={onCancel} onMessage={onMessage} onSave={(patch) => onSave(patch, "Profile saved")} />,
    bio: editing === "bio" && <BioEditor key={seed} value={profile.bio} onCancel={onCancel} onSave={(bio) => onSave({ bio }, "Bio saved")} />,
    skills: editing === "skills" && <SkillsEditor key={seed} skills={profile.skills} onCancel={onCancel} onSave={(skills) => onSave({ skills }, "Skills saved")} />,
    // The samples keep themselves (@/lib/demo/portfolio), and the editor is keyed on them for the same reason.
    samples: editing === "samples" && <SamplesEditor key={samples.map((s) => s.id).join(",")} samples={samples} onCancel={onCancel} onMessage={onMessage} onSaved={() => onSaved("Work samples saved")} />,
    portfolio: editing === "links" && <LinksEditor key={seed} links={profile.links} onCancel={onCancel} onSave={(links) => onSave({ links }, "Links saved")} />,
  };
}
