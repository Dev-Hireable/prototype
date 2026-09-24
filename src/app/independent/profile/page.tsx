"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { BioEditor, HeroEditor, LinksEditor, SkillsEditor } from "@/components/independent/ProfileEditors";
import { Button, Modal, Page, Toast, useToast } from "@/components/independent/ui";
import { EditButton } from "@/components/portal/InlineEdit";
import { FlatBadge, TalentProfile } from "@/components/portal/TalentProfile";
import { checkIntro, INTRO_TYPES, saveIntro, useIntroVideo } from "@/lib/demo/intro";
import { ME, pastEvaluations } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { useQueryState } from "@/lib/portal/query-state";

const Eye = ICONS.visibility;
const AddVideo = ICONS.videoAdd;

/** What's open for editing. It's in the URL, so /independent/profile?edit=profile lands in the header's editor. */
const EDITS = ["none", "profile", "bio", "skills", "links"] as const;
type Edit = (typeof EDITS)[number];

/**
 * IN-060 — your profile exactly as Team Builders read it (the same TalentProfile their Discover page
 * and preview sheet draw), edited in place the way Create Role's Review is: the pencil next to a part
 * turns it into its fields with Cancel / Save, and the other pencils wait until that's done — no
 * modal, no separate page (IN-061, IN-062, IN-065). Your intro video is added from its own card.
 */
export default function Profile() {
  const { profile, setProfile, tags, contracts } = useDemo();
  const router = useRouter();
  /**
   * IN-066 — every evaluation received, from live contracts first and closed engagements after.
   * Read-only: nothing here can be edited or removed from this side.
   */
  const history = [
    // Off the contracts themselves — this read an empty seed, so a submitted evaluation never showed.
    ...contracts.flatMap((c) => c.evaluations.map((e) => ({ company: c.company, role: c.title, type: c.type, date: e.date, stars: e.stars, feedback: e.feedback }))),
    ...pastEvaluations,
  ];
  const [editing, setEditing] = useQueryState<Edit>("edit", "none", EDITS);
  const done = () => setEditing("none");
  const [retake, setRetake] = useState(false);
  const [toast, setToast] = useToast();
  const introVideo = useIntroVideo();
  const introFile = useRef<HTMLInputElement>(null);
  /**
   * An editor starts from the saved profile, which loads from storage just after mount; keying on it
   * re-seeds an editor opened straight from the URL, instead of leaving it on the seed.
   */
  const seed = [profile.name, profile.headline, profile.rate, profile.level, profile.location, profile.bio, profile.skills.join(","), profile.photo.length, Object.values(profile.links).join(",")].join("|");
  /** Another part is open: Save or Cancel it first, as on Create Role's Review. */
  const locked = editing !== "none";
  /** The pencil next to a part (its own editor replaces the part, pencil and all). */
  const pencil = (label: string, part: Edit) => editing !== part && <EditButton label={label} onClick={() => setEditing(part)} disabled={locked} />;

  return (
    <Page title="Profile">
      <TalentProfile
        viewer="self"
        person={{ ...profile, intro: ME.intro, introVideo: introVideo ?? undefined, tags, history }}
        badge={<FlatBadge>Pro</FlatBadge>}
        note={
          // IN-060 — this page is the Team Builder's view of you, not a separate internal one.
          <p className="flex items-center gap-1.5 text-[13px] leading-[1.4] text-ink-2">
            <Eye size={16} aria-hidden className="shrink-0" />
            This is exactly how your profile appears to Team Builders.
          </p>
        }
        onPlayIntro={() => setToast("Intro video plays here")}
        introAction={
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
                if (problem) return setToast(problem);
                try {
                  await saveIntro(file);
                  setToast(introVideo ? "Intro video changed" : "Intro video added");
                } catch {
                  setToast("That video couldn't be saved. Try a shorter one.");
                }
              }}
            />
            <button
              type="button"
              onClick={() => introFile.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white pr-3 pl-2 text-[13px] leading-none font-medium text-ink shadow-[0_2px_8px_rgba(0,0,0,.15)] transition hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <AddVideo size={18} aria-hidden className="text-primary" />
              {introVideo ? "Change intro" : "Add intro"}
            </button>
          </>
        }
        edit={{
          // IN-061 — photo, name, headline, where you are and your links, rate and experience.
          profile: pencil("profile details", "profile"),
          // IN-062 — the bio, 500 characters at most.
          bio: pencil("bio", "bio"),
          // IN-063 / IN-064 — the tags are display-only: the only way to change them is to retake the quiz, which is the
          // real app's onboarding (/onboarding/talent), after a confirmation.
          tags: tags.length ? (
            <EditButton label="workplace tags" tip="Retake the quiz to change your tags" onClick={() => setRetake(true)} disabled={locked} />
          ) : (
            <EditButton label="workplace tags" tip="Take the work-style quiz" href="/onboarding/talent" disabled={locked} />
          ),
          // IN-065 — Create Role's skill picker.
          skills: pencil("skills", "skills"),
          portfolio: pencil("portfolio links", "links"),
        }}
        editor={{
          profile: editing === "profile" && (
            <HeroEditor
              key={seed}
              profile={profile}
              onCancel={done}
              onMessage={setToast}
              onSave={(patch) => {
                setProfile(patch);
                done();
                setToast("Profile saved");
              }}
            />
          ),
          bio: editing === "bio" && (
            <BioEditor
              key={seed}
              value={profile.bio}
              onCancel={done}
              onSave={(bio) => {
                setProfile({ bio });
                done();
                setToast("Bio saved");
              }}
            />
          ),
          skills: editing === "skills" && (
            <SkillsEditor
              key={seed}
              skills={profile.skills}
              onCancel={done}
              onSave={(skills) => {
                setProfile({ skills });
                done();
                setToast("Skills saved");
              }}
            />
          ),
          portfolio: editing === "links" && (
            <LinksEditor
              key={seed}
              links={profile.links}
              onCancel={done}
              onSave={(links) => {
                setProfile({ links });
                done();
                setToast("Links saved");
              }}
            />
          ),
        }}
      />

      {/* IN-064 — confirm before restarting; the current tags stand until the new answers are in. */}
      <Modal
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the work-style quiz?"
        description="Your current tags stay on your profile until you finish the new quiz. Six scenarios, and your tags and match scores update when you finish."
        footer={
          <>
            <Button size="lg" onClick={() => setRetake(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => router.push("/onboarding/talent")}>
              Start quiz
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
