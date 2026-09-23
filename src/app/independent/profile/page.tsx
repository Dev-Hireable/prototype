"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, Field, JobBadge, KeyValue, LinkButton, Modal, Page, Textarea, Toast, useToast } from "@/components/independent/ui";
import { BIO_MAX, pastEvaluations } from "@/lib/independent/data";
import { emptyQuiz, quizComplete, WorkStyleQuiz, type QuizState } from "@/components/portal/WorkStyleQuiz";
import { useDemo } from "@/lib/independent/store";

const Star = ICONS.star;
const Bookmark = ICONS.saved;

const H2 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink-deep";

/** Figma "Profile / Talent profile · view" + "Retake quiz · confirm": two equal columns (gap 24), cards p 16 / gap 24. */
export default function Profile() {
  const { profile, setProfile, workStyle, setWorkStyle, tags, contracts } = useDemo();
  /**
   * IN-066 — every evaluation received, from live contracts first and closed engagements after.
   * Read-only: nothing here can be edited or removed from this side.
   */
  const history = [
    // Off the contracts themselves — this read an empty seed, so a submitted evaluation never showed.
    ...contracts.flatMap((c) => c.evaluations.map((e) => ({ company: c.company, role: c.title, type: c.type, date: e.date, stars: e.stars, feedback: e.feedback }))),
    ...pastEvaluations,
  ];
  const [retake, setRetake] = useState(false);
  /** IN-064 — the quiz itself, once the confirmation has been accepted. */
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  /** IN-062 — the bio has its own editor, with the 500-character limit on it. */
  const [bio, setBio] = useState<string | null>(null);
  const [toast, setToast] = useToast();

  return (
    <Page title="Profile">
      <div className="flex items-center justify-between gap-3">
        {/* IN-060 — this page is the Team Builder's view of you, not a separate internal one. */}
        <p className="text-[13px] leading-[1.4] text-ink-2">This is exactly how your profile appears to Team Builders.</p>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#eef9f2] px-2.5 py-1 text-[12px] leading-4 font-semibold tracking-[0.24px] text-ok">Pro</span>
          <Button size="lg" onClick={() => setRetake(true)}>
            Retake quiz
          </Button>
          <LinkButton size="lg" variant="primary" href="/independent/profile/edit">
            Edit profile
          </LinkButton>
        </div>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* About: p 16, gap 24 */}
          <Card className="flex flex-col gap-6 p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3">
                <span className="relative size-14">
                  <Image src={profile.photo} alt="" width={112} height={112} className="size-14 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
                  <span className="absolute top-[43px] left-[43px] size-2.5 rounded-full bg-ok ring-2 ring-white" />
                </span>
                <div className="flex flex-col justify-center leading-[1.5] tracking-[0.2px] whitespace-nowrap">
                  <p className="font-display text-[24px] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                    {profile.name}
                  </p>
                  <p className="text-[16px] text-ink-2">{profile.headline}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Bookmark profile"
                onClick={() => setToast("Profile bookmarked")}
                className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary"
              >
                <Bookmark size={16} aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink">{profile.bio}</p>
              {/* IN-062 — edit the bio where you read it, without opening the whole form. */}
              <Button size="sm" className="self-start" onClick={() => setBio(profile.bio)}>
                Edit bio
              </Button>
            </div>
          </Card>
          <Card className="flex flex-col gap-6 p-4">
            <h2 className={H2}>Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Chip key={s}>{s.replace(/^\w/, (c) => c.toUpperCase())}</Chip>
              ))}
            </div>
          </Card>
          {/* IN-066 — company, role, contract type, date, rating and the written feedback. */}
          <Card className="flex flex-col gap-6 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={H2}>Performance history</h2>
              <span className="text-[12px] leading-[1.4] text-ink-2">{history.length === 1 ? "1 evaluation" : `${history.length} evaluations`} · read-only</span>
            </div>
            <div className="flex flex-col gap-3">
              {history.map((h, i) => (
                <div key={`${h.company}-${h.date}`} className={`flex flex-col gap-2 pb-4 ${i < history.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] leading-[1.3] font-semibold text-ink">{h.company}</span>
                      <span className="flex items-center gap-2 text-[12px] leading-[1.3] text-ink-2">
                        {h.role} <JobBadge type={h.type} />
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="flex h-3 items-center gap-[3px] text-warn" aria-label={`${h.stars} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} aria-hidden className={n <= h.stars ? "" : "text-[#d8d8d8]"} />
                        ))}
                      </span>
                      <span className="text-[10px] text-[#757575]">{h.date}</span>
                    </span>
                  </div>
                  <p className="text-[12px] leading-[1.45] text-ink-2 italic">&quot;{h.feedback}&quot;</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex flex-col gap-6 p-4">
            <h2 className={H2}>Rate &amp; details</h2>
            <div className="flex gap-2">
              <KeyValue label="Rate" value={`$${profile.rate}.00/mo`} />
              <KeyValue label="Experience" value={profile.level} />
              <KeyValue label="Location" value={profile.location} />
            </div>
          </Card>
          {/* IN-063 — derived from the quiz answers and display-only: the only way to change them is to retake it. */}
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-[16px] leading-[1.4] font-semibold text-ink">Work-style tags</h2>
            <p className="text-[12px] leading-[1.4] text-ink-2">Worked out from your quiz answers, not typed in. Team Builders see these on your profile, and your match score on every role comes from the same answers.</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
            <Button size="sm" className="self-start" onClick={() => setRetake(true)}>
              Retake quiz to change them
            </Button>
          </Card>
          <Card className="flex flex-col gap-4 p-6 text-[13px] leading-[1.4]">
            <h2 className="text-[16px] font-semibold text-ink">Links</h2>
            {Object.entries({ LinkedIn: profile.links.linkedin, Portfolio: profile.links.portfolio, Website: profile.links.website }).map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-[90px] font-medium text-ink-2">{k}</span>
                {v ? (
                  <a href={`https://${v}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {v}
                  </a>
                ) : (
                  <span className="text-ink-2">Not added</span>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* IN-064 — confirm before restarting; the current tags stand until the new answers are in. */}
      <Modal
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the work-style quiz?"
        description="Your current tags stay on your profile until you finish the new quiz. Six questions, and your tags and match scores update the moment you finish."
        footer={
          <>
            <Button size="lg" onClick={() => setRetake(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                setRetake(false);
                setQuiz(emptyQuiz(workStyle));
              }}
            >
              Start quiz
            </Button>
          </>
        }
      />

      <Modal
        open={!!quiz}
        onClose={() => setQuiz(null)}
        width={640}
        title="Work-style quiz"
        description="Six questions, one per trait. Answer as you actually work, not as you would like to."
        footer={
          <>
            <Button size="lg" onClick={() => setQuiz(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!quiz || !quizComplete(quiz)}
              onClick={() => {
                if (!quiz) return;
                setWorkStyle(quiz.answers.map((a) => a ?? 3));
                setQuiz(null);
                setToast("Work-style tags updated — your match scores have been recalculated");
              }}
            >
              Finish quiz
            </Button>
          </>
        }
      >
        {quiz && <WorkStyleQuiz state={quiz} onChange={(next) => setQuiz((prev) => (prev ? (typeof next === "function" ? next(prev) : next) : prev))} />}
      </Modal>

      {/* IN-062 — 500 characters, saved the moment you press save. */}
      <Modal
        open={bio !== null}
        onClose={() => setBio(null)}
        title="Edit bio"
        description="Team Builders read this first, above your skills and history."
        footer={
          <>
            <Button size="lg" onClick={() => setBio(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!bio?.trim()}
              onClick={() => {
                setProfile({ bio: (bio ?? "").trim() });
                setBio(null);
                setToast("Bio saved");
              }}
            >
              Save bio
            </Button>
          </>
        }
      >
        <Field label={`Bio · ${(bio ?? "").length} / ${BIO_MAX}`}>
          <Textarea rows={6} maxLength={BIO_MAX} value={bio ?? ""} onChange={(e) => setBio(e.target.value)} />
        </Field>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
