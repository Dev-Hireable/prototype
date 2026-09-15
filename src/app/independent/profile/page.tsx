"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, KeyValue, LinkButton, Modal, Page, Toast, useToast } from "@/components/independent/ui";
import { ME, profile } from "@/lib/independent/data";

const Star = ICONS.star;
const Bookmark = ICONS.saved;

const H2 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink-deep";

/** Figma "Profile / Talent profile · view" + "Retake quiz · confirm": two equal columns (gap 24), cards p 16 / gap 24. */
export default function Profile() {
  const [retake, setRetake] = useState(false);
  const [toast, setToast] = useToast();

  return (
    <Page title="Profile">
      <div className="flex items-center justify-end gap-3">
        <span className="rounded-full bg-[#eef9f2] px-2.5 py-1 text-[12px] leading-4 font-semibold tracking-[0.24px] text-ok">Pro</span>
        <Button size="lg" onClick={() => setRetake(true)}>
          Retake quiz
        </Button>
        <LinkButton size="lg" variant="primary" href="/independent/profile/edit">
          Edit profile
        </LinkButton>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* About: 272 tall, p 16, gap 24 */}
          <Card className="flex h-[272px] flex-col gap-6 p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3">
                <span className="relative size-14">
                  <Image src={ME.avatar} alt="" width={112} height={112} className="size-14 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
                  <span className="absolute top-[43px] left-[43px] size-2.5 rounded-full bg-ok ring-2 ring-white" />
                </span>
                <div className="flex flex-col justify-center leading-[1.5] tracking-[0.2px] whitespace-nowrap">
                  <p className="font-display text-[24px] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                    {ME.name}
                  </p>
                  <p className="text-[16px] text-ink-2">{ME.headline}</p>
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
            <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{profile.bio}</p>
          </Card>
          <Card className="flex flex-col gap-6 p-4">
            <h2 className={H2}>Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Chip key={s}>{s.replace(/^\w/, (c) => c.toUpperCase())}</Chip>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col gap-6 p-4">
            <h2 className={H2}>History</h2>
            <div className="flex flex-col gap-3">
              {profile.history.map((h, i) => (
                <div key={h.role} className={`flex flex-col gap-3 pb-4 ${i < profile.history.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}>
                  <p className="flex items-center justify-between leading-[1.2] tracking-[0.2px]">
                    <span className="text-[12px] font-semibold text-ink">{h.role}</span>
                    <span className="flex items-center gap-4">
                      <span className="flex h-3 w-[72px] items-center gap-[3px] text-warn">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} aria-hidden />
                        ))}
                      </span>
                      <span className="text-[10px] text-[#757575]">{h.date}</span>
                    </span>
                  </p>
                  <p className="text-[10px] leading-[1.2] tracking-[0.2px] text-ink-2 italic">&quot;{h.quote}&quot;</p>
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
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-[16px] leading-[1.4] font-semibold text-ink">Work-style tags</h2>
            <p className="text-[12px] leading-[1.4] text-ink-2">From your quiz on 2 Sep 2026. Employers see these on your profile.</p>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col gap-4 p-6 text-[13px] leading-[1.4]">
            <h2 className="text-[16px] font-semibold text-ink">Links</h2>
            {Object.entries({ LinkedIn: profile.links.linkedin, Portfolio: profile.links.portfolio, Website: profile.links.website }).map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-[90px] font-medium text-ink-2">{k}</span>
                <a href={`https://${v}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {v}
                </a>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the work-style quiz?"
        description="Your current tags stay on your profile until you finish the new quiz. It takes about 8 minutes and your matches update afterwards."
        footer={
          <>
            <Button size="lg" onClick={() => setRetake(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setRetake(false); setToast("Quiz opens in a new tab"); }}>
              Start quiz
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
