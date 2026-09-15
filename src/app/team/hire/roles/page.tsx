"use client";

import Link from "next/link";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, JobBadge, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Row, Table, Toolbar } from "@/components/team/ui";
import { ROLE_STATUS } from "@/lib/team/data";
import type { Role, RoleStatus } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const More = ICONS.moreV;
/** Figma columns: Role flex · Status 110 · Candidates 100 · Matched 90 · Interviews 90 · Offers 80 · Hired 70 · Updated 120 · Actions 60. */
const COLS = ["min-w-0 flex-1", "w-[110px]", "w-[100px]", "w-[90px]", "w-[90px]", "w-[80px]", "w-[70px]", "w-[120px]", "w-[60px]"];

type Confirm = { role: Role; action: "close" | "reopen" | "archive" | "delete" };

/** Figma "Hire / All roles · list / · draft filter / · archived filter" + close / reopen / archive / delete confirms. */
export default function AllRoles() {
  const { roles, setRoleStatus, removeRole } = useDemo();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [type, setType] = useState("Trial and full-time");
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useToast();

  const list = roles.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "All statuses" && r.status !== status) return false;
    if (type === "Trial" && r.type !== "trial") return false;
    if (type === "Full-time" && r.type !== "full-time") return false;
    return true;
  });
  const count = (s: RoleStatus) => roles.filter((r) => r.status === s).length;
  const fmt = (n: number | null) => (n === null ? "—" : String(n));

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
      <div onClick={() => setMenu(null)} className="flex flex-col gap-6">
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

        <Table cols={COLS} head={["Role", "Status", "Candidates", "Matched", "Interviews", "Offers", "Hired", "Updated", "Actions"]}>
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
              {[r.candidates, r.matched, r.interviews, r.offers, r.hired].map((n, i) => (
                <span key={i} className={`${COLS[2 + i]} text-[14px]`}>
                  {fmt(n)}
                </span>
              ))}
              <span className={COLS[7]}>{r.updated}</span>
              <span className={`${COLS[8]} relative`}>
                <button
                  type="button"
                  aria-label="Role actions"
                  aria-expanded={menu === r.slug}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenu(menu === r.slug ? null : r.slug);
                  }}
                  className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-surface-alt"
                >
                  <More size={20} aria-hidden />
                </button>
                {menu === r.slug && (
                  <div role="menu" className="absolute top-9 right-0 z-10 flex w-48 flex-col rounded-lg bg-white py-1 text-[14px] shadow-[0_8px_24px_rgba(0,0,0,.14)] outline -outline-offset-1 outline-border" onClick={(e) => e.stopPropagation()}>
                    <Link role="menuitem" href={`/team/hire/roles/${r.slug}`} className="px-3 py-2 text-left hover:bg-surface-alt">
                      View candidates
                    </Link>
                    {r.status === "Active" ? (
                      <button role="menuitem" type="button" onClick={() => { setConfirm({ role: r, action: "close" }); setMenu(null); }} className="px-3 py-2 text-left hover:bg-surface-alt">
                        Close role
                      </button>
                    ) : (
                      <button role="menuitem" type="button" onClick={() => { setConfirm({ role: r, action: "reopen" }); setMenu(null); }} className="px-3 py-2 text-left hover:bg-surface-alt">
                        Reopen role
                      </button>
                    )}
                    {r.status !== "Archived" && (
                      <button role="menuitem" type="button" onClick={() => { setConfirm({ role: r, action: "archive" }); setMenu(null); }} className="px-3 py-2 text-left hover:bg-surface-alt">
                        Archive role
                      </button>
                    )}
                    <button role="menuitem" type="button" onClick={() => { setConfirm({ role: r, action: "delete" }); setMenu(null); }} className="px-3 py-2 text-left text-danger hover:bg-surface-alt">
                      Delete role
                    </button>
                  </div>
                )}
              </span>
            </Row>
          ))}
          {list.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">No roles match these filters.</p>}
        </Table>
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
                delete: "This removes the role, its candidates and history for good. Independents who applied are told the role was withdrawn.",
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
