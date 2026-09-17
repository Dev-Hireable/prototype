"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, EmptyState, JobBadge, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { KebabMenu, MenuAction, MenuLink } from "@/components/portal/controls";
import { Row, Table, Toolbar } from "@/components/team/ui";
import { ROLE_STATUS } from "@/lib/team/data";
import type { Role, RoleStatus } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { draftReady } from "@/app/team/hire/new/page";

/** Figma columns: Role flex · Status 110 · Candidates 100 · Matched 90 · Interviews 90 · Offers 80 · Hired 70 · Updated 120 · Actions 60. */
const COLS = ["min-w-0 flex-1", "w-[104px]", "w-[96px]", "w-[86px]", "w-[86px]", "w-[76px]", "w-[68px]", "w-[80px]", "w-[108px]", "w-[56px]"];
const Edit = ICONS.edit;
const Copy = ICONS.copy;
const Trash = ICONS.trash;
const Check = ICONS.check;

type Confirm = { role: Role; action: "close" | "reopen" | "archive" | "delete" };

/** One tone per pipeline column, in table order (Candidates → Dropped). */
const STAT_TONES = ["bg-[#eeeeee] text-ink", "bg-[#e6f4ff] text-[#005b99]", "bg-[#fff2e5] text-[#8a4200]", "bg-[#f6ecff] text-[#6b21a8]", "bg-[#e7f7ed] text-[#1b6b3a]", "bg-[#fdecec] text-[#a62121]"];

/** A dash reads better than a 0 badge for a draft that has no pipeline at all. */
function Stat({ value, tone }: { value: number | null; tone: string }) {
  if (value === null) return <span className="text-[14px] text-ink-2">—</span>;
  return <span className={`inline-flex h-6 min-w-7 items-center justify-center rounded-md px-2 text-[13px] leading-[1.2] font-medium ${tone}`}>{value}</span>;
}

/** Figma "Hire / All roles · list / · draft filter / · archived filter" + close / reopen / archive / delete confirms. */
export default function AllRoles() {
  const { roles, candidates, setRoleStatus, removeRole, duplicateRole } = useDemo();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [type, setType] = useState("Trial and full-time");
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useToast();
  const router = useRouter();

  const list = roles.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "All statuses" && r.status !== status) return false;
    if (type === "Trial" && r.type !== "trial") return false;
    if (type === "Full-time" && r.type !== "full-time") return false;
    return true;
  });
  const count = (s: RoleStatus) => roles.filter((r) => r.status === s).length;
  /** Live, unlike the seeded stats — drops and undrops in the tracker move this number. */
  const dropped = (r: Role) => (r.candidates === null ? null : candidates.filter((c) => c.role === r.slug && c.dropped).length);

  const duplicate = (r: Role) => {
    setMenu(null);
    const copy = duplicateRole(r.slug);
    setToast(copy ? `${r.title} duplicated as a draft` : "Could not duplicate that role");
  };

  /** TB-035 — incomplete drafts can't go live; send the user back to finish them instead. */
  const publishDraft = (r: Role) => {
    setMenu(null);
    if (!draftReady(r)) {
      setToast("Some required fields are still empty — opening the draft so you can finish it");
      router.push(`/team/hire/new?edit=${r.slug}`);
      return;
    }
    setRoleStatus(r.slug, "Active");
    setToast(`${r.title} is now live`);
  };

  const apply = () => {
    if (!confirm) return;
    const { role, action } = confirm;
    if (action === "delete") removeRole(role.slug);
    else setRoleStatus(role.slug, action === "close" ? "Closed" : action === "reopen" ? "Active" : "Archived");
    setToast({ close: "Role closed", reopen: "Role reopened", archive: "Role archived", delete: "Role deleted" }[action]);
    setConfirm(null);
  };

  return (
    <Page title="All roles">
      <div onClick={() => setMenu(null)} className="flex min-h-full w-full flex-col gap-6">
        <Toolbar
          right={
            <>
              <span className="text-[14px] leading-[1.4] text-ink-2">
                {count("Active")} active · {count("Draft")} draft · {count("Closed")} closed
              </span>
              <LinkButton size="lg" variant="primary" href="/team/hire">
                Create role
              </LinkButton>
            </>
          }
        >
          <SearchBox value={q} onChange={setQ} placeholder="Search roles" className="w-[320px]" />
          <Select options={["All statuses", "Active", "Draft", "Closed", "Archived"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[160px]" />
          <Select options={["Trial and full-time", "Trial", "Full-time"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[190px]" />
        </Toolbar>

        {/* TB-026: nothing posted yet is a different situation from a filter that matched nothing. */}
        {roles.length === 0 ? (
          <EmptyState
            title="No roles posted yet"
            body="Create your first role to start collecting applications and matching independents."
            action={
              <LinkButton href="/team/hire" variant="primary" size="lg">
                Create role
              </LinkButton>
            }
          />
        ) : (
        <Table cols={COLS} head={["Role", "Status", "Candidates", "Matched", "Interviews", "Offers", "Hired", "Dropped", "Updated", "Actions"]}>
          {list.map((r) => (
            <Row key={r.slug}>
              <span className={`${COLS[0]} flex items-center gap-2`}>
                <Link href={`/team/hire/roles/${r.slug}`} className="text-[14px] font-medium text-primary hover:underline">
                  {r.title}
                </Link>
                <JobBadge type={r.type} />
              </span>
              <span className={COLS[1]}>
                <StatusDot tone={ROLE_STATUS[r.status]}>{r.status}</StatusDot>
              </span>
              {/* TB-026: stats read as coloured badges while the role is live and grey once it
                  isn't, so a closed role doesn't look like it's still collecting people. */}
              {[r.candidates, r.matched, r.interviews, r.offers, r.hired, dropped(r)].map((n, i) => (
                <span key={i} className={COLS[2 + i]}>
                  <Stat value={n} tone={r.status === "Active" ? STAT_TONES[i] : "bg-[#eeeeee] text-ink-2"} />
                </span>
              ))}
              {/* TB-026: a draft has no posted date. */}
              <span className={COLS[8]}>{r.status === "Draft" ? "—" : r.updated}</span>
              <span className={COLS[9]}>
                <KebabMenu
                  label="Role actions"
                  open={menu === r.slug}
                  onOpenChange={(open) => setMenu(open ? r.slug : null)}
                  itemCount={r.status === "Draft" ? 4 : r.status === "Archived" ? 3 : 4}
                  iconSize={20}
                  menuWidth={220}
                  buttonClassName="!size-7 !rounded-full"
                >
                  {r.status === "Draft" ? (
                    <>
                      <MenuLink href={`/team/hire/new?type=${r.type}&edit=${r.slug}`} icon={<Edit size={18} aria-hidden />}>
                        Continue editing
                      </MenuLink>
                      <MenuAction onClick={() => duplicate(r)} icon={<Copy size={18} aria-hidden />}>
                        Duplicate
                      </MenuAction>
                      {/* TB-035: publish straight from the list, but only once the draft is complete. */}
                      <MenuAction onClick={() => publishDraft(r)} icon={<Check size={18} aria-hidden />}>
                        Publish
                      </MenuAction>
                      <MenuAction destructive onClick={() => { setConfirm({ role: r, action: "delete" }); setMenu(null); }} icon={<Trash size={18} aria-hidden />}>
                        Delete draft
                      </MenuAction>
                    </>
                  ) : (
                    <>
                      <MenuLink density="compact" href={`/team/hire/roles/${r.slug}`}>
                        View candidates
                      </MenuLink>
                      {/* TB-032: duplicating is offered on any post, not just drafts. */}
                      <MenuAction density="compact" onClick={() => duplicate(r)}>
                        Duplicate
                      </MenuAction>
                      {r.status === "Active" ? (
                        <MenuAction density="compact" onClick={() => { setConfirm({ role: r, action: "close" }); setMenu(null); }}>
                          Close role
                        </MenuAction>
                      ) : (
                        <MenuAction density="compact" onClick={() => { setConfirm({ role: r, action: "reopen" }); setMenu(null); }}>
                          Reopen role
                        </MenuAction>
                      )}
                      {r.status !== "Archived" && (
                        <MenuAction density="compact" onClick={() => { setConfirm({ role: r, action: "archive" }); setMenu(null); }}>
                          Archive role
                        </MenuAction>
                      )}
                    </>
                  )}
                </KebabMenu>
              </span>
            </Row>
          ))}
          {list.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">No roles match these filters.</p>}
        </Table>
        )}
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone={confirm?.action === "delete" ? "danger" : "default"}
        title={confirm ? { close: `Close ${confirm.role.title}?`, reopen: `Reopen ${confirm.role.title}?`, archive: `Archive ${confirm.role.title}?`, delete: `Delete ${confirm.role.title}?` }[confirm.action] : ""}
        description={
          confirm
            ? {
                close: "New applications stop and the role leaves the job board. Candidates already in the tracker keep their stage; you can reopen it any time.",
                reopen: "The role goes back on the job board and matched independents are notified again.",
                archive: "The role moves to Archived with its candidates and history. It no longer counts toward your active roles.",
                delete: "Drafts were never published, so no one has seen or applied to this one. Deleting it cannot be undone.",
              }[confirm.action]
            : ""
        }
        footer={
          <>
            <Button size="lg" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button size="lg" variant={confirm?.action === "delete" ? "danger" : "primary"} onClick={apply}>
              {confirm ? { close: "Close role", reopen: "Reopen role", archive: "Archive role", delete: "Delete role" }[confirm.action] : ""}
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
