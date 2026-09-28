"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, Initials, JobBadge, KebabMenu, LinkButton, MatchPill, Modal, Page, StatusDot, Toast } from "@/components/independent/ui";
import { KanbanColumn, KanbanEmpty, KanbanList } from "@/components/portal/board";
import { MenuAction, MenuLink } from "@/components/portal/controls";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { usePostings } from "@/lib/demo/deal";
import { COLUMNS, MATCH_TOOLTIP, roleFromPosting } from "@/lib/independent/data";
import type { Application, Role } from "@/lib/independent/data";
import { useApplications } from "@/lib/independent/applications";
import { useToast } from "@/lib/portal/toast";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

export default function MyApplications() {
  const { applications, withdraw, canWithdraw, canChat } = useApplications();
  /** The postings behind the cards — this read an empty seed, so every card said Trial. */
  const roles = usePostings().map(roleFromPosting);
  const [target, setTarget] = useState<Application | null>(null);
  const [toast, setToast] = useToast();
  const withReturn = useWithReturn();

  return (
    <Page title="My Applications" padded={false} nav={<ReturnNav />}>
      <Board applications={applications} roles={roles} canWithdraw={canWithdraw} canChat={canChat} chatHref={withReturn("/independent/messages?with=c1")} onWithdraw={setTarget} />

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
                const done = target ? withdraw(target.id) : false;
                setTarget(null);
                setToast(done ? "Application withdrawn" : "This application can't be withdrawn any more", done ? "success" : "danger");
              }}
            >
              Withdraw application
            </Button>
          </>
        }
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * The board: a column for each group of stages, each application a card with its ⋮ menu — one menu
 * open at a time. `chatHref` is the thread Message Team Builder opens once `canChat`.
 */
function Board({ applications, roles, canWithdraw, canChat, chatHref, onWithdraw }: { applications: Application[]; roles: Role[]; canWithdraw: (a: Application) => boolean; canChat: boolean; chatHref: string; onWithdraw: (a: Application) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    // The 40px side and bottom gutters are padding inside the board, so its horizontal bar runs
    // along the panel's bottom edge, 8px in, like every vertical bar, instead of floating 48px up.
    // At rest the padding lines the columns up with the back-link row; scrolled, cards pass
    // through it and fade out at the edge (ScrollFade's mask) instead of being cut flush.
    <div className="flex min-h-0 flex-1 pt-4">
      <ScrollFade className="flex w-full min-w-0">
        {/* overflow-y-hidden is load-bearing: `overflow-x: auto` alone implicitly turns the y axis
            into a second scrollbar nested inside the shell's. Columns take the vertical scroll. */}
        <div className="edge-fade flex w-full min-w-0 gap-3 overflow-x-auto overflow-y-hidden px-10 pb-10">
          {COLUMNS.map((col) => {
            const cards = applications.filter((a) => col.stages.includes(a.stage));
            return (
              <KanbanColumn key={col.key} label={col.label} count={cards.length} colors={col} unit={["application", "applications"]} width="min-w-[320px] max-w-[420px] flex-1">
                <KanbanList>
                  {cards.map((a) => (
                    // IN-018 wants the company and the real contract type on the card; the type
                    // was hardcoded to "trial" for every application regardless of the role.
                    <ApplicationCard
                      key={a.id}
                      app={a}
                      role={roles.find((r) => r.slug === a.roleSlug)}
                      menu={<CardMenu app={a} open={menu === a.id} onOpenChange={(open) => setMenu(open ? a.id : null)} canChat={canChat} chatHref={chatHref} withdrawable={canWithdraw(a)} onWithdraw={() => { onWithdraw(a); setMenu(null); }} />}
                    />
                  ))}
                  {cards.length === 0 && <KanbanEmpty>Nothing here yet</KanbanEmpty>}
                </KanbanList>
              </KanbanColumn>
            );
          })}
        </div>
      </ScrollFade>
    </div>
  );
}

/** One application: who and what, its ⋮ menu, the type and match, where it stands — and, with an offer out, the way to it. */
function ApplicationCard({ app: a, role, menu }: { app: Application; role: Role | undefined; menu: ReactNode }) {
  return (
    <li className={`relative flex flex-col gap-3 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border ${a.status?.label === "Not moving forward" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <Initials text={role?.initials ?? a.company.slice(0, 2).toUpperCase()} className="size-8 shrink-0 text-[11px]" />
        <Link href={`/independent/jobs/applications/${a.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] hover:text-primary">
          <span className="truncate text-[14px] font-semibold tracking-[0.2px] text-ink">{a.title}</span>
          <span className="truncate text-[12px] text-ink-2">{a.company}</span>
        </Link>
        {menu}
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
      {a.stage === "offer_received" && a.status?.label === "Offer received" && (
        <LinkButton size="sm" variant="primary" href={`/independent/jobs/applications/${a.id}/offer`} className="justify-center">
          Review offer
        </LinkButton>
      )}
    </li>
  );
}

/** The card's ⋮ menu: open the application, message the Team Builder, or withdraw it. */
function CardMenu({ app, open, onOpenChange, canChat, chatHref, withdrawable, onWithdraw }: { app: Application; open: boolean; onOpenChange: (open: boolean) => void; canChat: boolean; chatHref: string; withdrawable: boolean; onWithdraw: () => void }) {
  return (
    <KebabMenu label="Application actions" open={open} onOpenChange={onOpenChange} iconSize={16} buttonClassName="!size-6">
      <MenuLink density="compact" href={`/independent/jobs/applications/${app.id}`}>
        View application
      </MenuLink>
      {/* IN-022 — on every card. It opens the conversation in Messages, like every
          other Message button, and waits for the interview invite that opens the
          thread (IN-006) instead of sending into a thread that doesn't exist yet. */}
      {canChat ? (
        <MenuLink density="compact" href={chatHref}>
          Message Team Builder
        </MenuLink>
      ) : (
        <MenuAction density="compact" disabled title="Messaging opens once you're invited to interview">
          Message Team Builder
        </MenuAction>
      )}
      {/* A signed offer is a contract: it is ended or disputed, never withdrawn —
          withdrawing used to delete the funded contract outright. */}
      <MenuAction density="compact" destructive disabled={!withdrawable} title={withdrawable ? undefined : "You've accepted the offer — the contract can be ended, not withdrawn"} onClick={onWithdraw}>
        Withdraw application
      </MenuAction>
    </KebabMenu>
  );
}
