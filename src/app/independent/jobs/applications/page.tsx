"use client";

import Link from "next/link";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, JobBadge, MatchPill, Modal, Page, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { COLUMNS } from "@/lib/independent/data";
import type { Application } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

const More = ICONS.moreV;

/** Figma "Job Board / My Applications": 360px columns, gap 8; header px 12 / py 8, 0.5px stroke; cards p 12, gap 12. */
export default function MyApplications() {
  const { applications, withdraw } = useDemo();
  const [menu, setMenu] = useState<string | null>(null);
  const [target, setTarget] = useState<Application | null>(null);
  const [toast, setToast] = useToast();

  return (
    <Page title="My Applications" padded={false}>
      {/* The gutter is on this wrapper, NOT on the scroller: padding inside a scroll container is
          scrolled through, so the scrollport would clip cards flush against the panel border. */}
      <div className="flex h-full min-h-0 p-2">
        <ScrollFade className="flex w-full min-w-0">
          {/* overflow-y-hidden is load-bearing: `overflow-x: auto` alone implicitly turns the y axis
              into a second scrollbar nested inside the shell's. Columns take the vertical scroll. */}
          <div className="flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden" onClick={() => setMenu(null)}>
            {COLUMNS.map((col) => {
              const cards = applications.filter((a) => col.stages.includes(a.stage));
              return (
                <section key={col.key} className="flex h-full min-h-0 w-[360px] shrink-0 flex-col gap-3">
                  <header
                    className="flex items-center justify-between rounded px-3 py-2 text-[14px] leading-[1.2] font-medium tracking-[0.2px]"
                    style={{
                      background: col.bg,
                      color: col.text,
                      boxShadow: `inset 0 0 0 0.5px ${col.border}`,
                    }}
                  >
                    {col.label}
                    <span className="w-9 rounded p-1 text-center" style={{ background: col.count }}>
                      {cards.length}
                    </span>
                  </header>
                  <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {cards.map((a) => (
                      <li key={a.id} className="relative flex flex-col gap-3 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/independent/jobs/applications/${a.id}`} className="w-[208px] text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink hover:text-primary">
                            {a.title}
                          </Link>
                          <button
                            type="button"
                            aria-label="Application actions"
                            aria-expanded={menu === a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(menu === a.id ? null : a.id);
                            }}
                            className="flex size-6 items-center justify-center rounded-full text-ink"
                          >
                            <More size={16} aria-hidden />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
                          <span className="flex items-center gap-1">
                            <JobBadge type="trial" />
                            <MatchPill pct={a.match} />
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
                        {menu === a.id && (
                          <div
                            role="menu"
                            className="absolute top-9 right-3 z-10 flex w-48 flex-col rounded-lg bg-white py-1 text-[14px] shadow-[0_8px_24px_rgba(0,0,0,.14)] outline -outline-offset-1 outline-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link role="menuitem" href={`/independent/jobs/applications/${a.id}`} className="px-3 py-2 text-left hover:bg-surface-alt">
                              View application
                            </Link>
                            <button
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                setTarget(a);
                                setMenu(null);
                              }}
                              className="px-3 py-2 text-left text-danger hover:bg-surface-alt"
                            >
                              Withdraw application
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
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
        description={`${target?.company ?? "The employer"} is notified and this application moves to Withdrawn. If a proposal is in progress it is cancelled too. You can apply again while the role stays open.`}
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
