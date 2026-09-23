"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Initials, JobBadge, KebabMenu, LinkButton, MatchPill, Modal, Page, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { MenuAction, MenuLink } from "@/components/portal/controls";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { COLUMNS, MATCH_TOOLTIP, roles } from "@/lib/independent/data";
import type { Application } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

/** Figma "Job Board / My Applications": 360px columns, gap 8; header px 12 / py 8, 0.5px stroke; cards p 12, gap 12. */
export default function MyApplications() {
  const { applications, withdraw, canChat } = useDemo();
  const [menu, setMenu] = useState<string | null>(null);
  const [target, setTarget] = useState<Application | null>(null);
  const [toast, setToast] = useToast();
  const withReturn = useWithReturn();

  return (
    <Page title="My Applications" padded={false} nav={<ReturnNav />}>
      {/* The 40px side and bottom gutters are padding inside the board, so its horizontal bar runs
          along the panel's bottom edge, 8px in, like every vertical bar, instead of floating 48px up.
          At rest the padding lines the columns up with the back-link row; scrolled, cards pass
          through it and fade out at the edge (ScrollFade's mask) instead of being cut flush. */}
      <div className="flex min-h-0 flex-1 pt-4">
        <ScrollFade className="flex w-full min-w-0">
          {/* overflow-y-hidden is load-bearing: `overflow-x: auto` alone implicitly turns the y axis
              into a second scrollbar nested inside the shell's. Columns take the vertical scroll. */}
          <div className="edge-fade flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden px-10 pb-10" onClick={() => setMenu(null)}>
            {COLUMNS.map((col) => {
              const cards = applications.filter((a) => col.stages.includes(a.stage));
              return (
                <section key={col.key} className="flex h-full min-h-0 w-[360px] shrink-0 flex-col gap-3">
                  <header
                    className="flex items-center justify-between rounded px-3 py-2 text-[14px] leading-[1.2] font-medium tracking-[0.2px]"
                    style={{ background: col.bg, color: col.text }}
                  >
                    {col.label}
                    <span className="w-9 rounded p-1 text-center" style={{ background: col.count }}>
                      {cards.length}
                    </span>
                  </header>
                  <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {cards.map((a) => {
                      // IN-018 wants the company and the real contract type on the card; the type
                      // was hardcoded to "trial" for every application regardless of the role.
                      const role = roles.find((r) => r.slug === a.roleSlug);
                      return (
                      <li key={a.id} className="relative flex flex-col gap-3 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border">
                        <div className="flex items-start gap-2">
                          <Initials text={role?.initials ?? a.company.slice(0, 2).toUpperCase()} className="size-8 shrink-0 text-[11px]" />
                          <Link href={`/independent/jobs/applications/${a.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] hover:text-primary">
                            <span className="truncate text-[14px] font-semibold tracking-[0.2px] text-ink">{a.title}</span>
                            <span className="truncate text-[12px] text-ink-2">{a.company}</span>
                          </Link>
                          <KebabMenu label="Application actions" open={menu === a.id} onOpenChange={(open) => setMenu(open ? a.id : null)} itemCount={3} iconSize={16} buttonClassName="!size-6 !rounded-full">
                            <MenuLink density="compact" href={`/independent/jobs/applications/${a.id}`}>
                              View application
                            </MenuLink>
                            {/* IN-022 — on every card. It opens the conversation in Messages, like every
                                other Message button, and waits for the interview invite that opens the
                                thread (IN-006) instead of sending into a thread that doesn't exist yet. */}
                            {canChat ? (
                              <MenuLink density="compact" href={withReturn("/independent/messages?with=c1")}>
                                Message Team Builder
                              </MenuLink>
                            ) : (
                              <MenuAction density="compact" disabled title="Messaging opens once you're invited to interview">
                                Message Team Builder
                              </MenuAction>
                            )}
                            <MenuAction density="compact" destructive onClick={() => { setTarget(a); setMenu(null); }}>
                              Withdraw application
                            </MenuAction>
                          </KebabMenu>
                        </div>
                        <div className="flex items-center justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
                          <span className="flex items-center gap-1">
                            <JobBadge type={role?.type ?? "trial"} />
                            <MatchPill pct={a.match} coded title={MATCH_TOOLTIP} />
                          </span>
                          <span>{a.submitted}</span>
                        </div>
                        {a.status && (
                          <>
                            <span aria-hidden className="h-px w-full bg-border" />
                            <div className="flex items-center justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
                              <StatusDot tone={a.status.tone}>{a.status.label}</StatusDot>
                              <span>{a.status.meta ?? ""}</span>
                            </div>
                          </>
                        )}
                        {/* IN-018 — an offer on the table gets its own way in. */}
                        {a.stage === "offer_received" && (
                          <LinkButton size="sm" variant="primary" href={`/independent/jobs/applications/${a.id}/offer`} className="justify-center">
                            Review offer
                          </LinkButton>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </ScrollFade>
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        tone="danger"
        title="Withdraw your application?"
        description={`${target?.company ?? "The employer"} is notified and this application moves to Withdrawn. If a proposal is in progress it is cancelled too. You cannot apply again to this role.`}
        footer={
          <>
            <Button size="lg" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                if (target) withdraw(target.id);
                setTarget(null);
                setToast("Application withdrawn");
              }}
            >
              Withdraw application
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
