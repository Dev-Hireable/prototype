"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, EmptyState, JobBadge, LinkButton, Modal, Page, Row, SearchBox, Select, StatusDot, Table, Toast, Toolbar } from "@/components/portal/ui";
import { KebabMenu, MenuAction, MenuLink } from "@/components/portal/controls";
import { Tip } from "@/components/portal/tip";
import { columnOf, ROLE_STATUS } from "@/lib/team/data";
import type { Candidate, Role, RoleStatus } from "@/lib/team/data";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { shortDayLabel } from "@/lib/portal/dates";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { draftReady, useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";

/**
 * One count per tracker column, in the tracker's own order, so the table and the role's pipeline
 * always show the same numbers. `key` is the TRACKER_COLUMNS key the cell counts and opens.
 * Pale fill, dark text — each pair clears 4.5:1. Solid fills with white text were tried and read
 * as a strip of traffic lights across the row.
 */
const STATS = [
  { key: "candidates", label: "Candidates", tone: "bg-[#eeeeee] text-ink" },
  { key: "matched", label: "Matched", tone: "bg-[#e6f4ff] text-[#005b99]" },
  { key: "interview", label: "Interviews", tone: "bg-[#fff2e5] text-[#8a4200]" },
  { key: "proposal", label: "Proposals", tone: "bg-[#fff3fb] text-[#6e0e52]" },
  { key: "offer", label: "Offers", tone: "bg-[#f6ecff] text-[#6b21a8]" },
  { key: "hired", label: "Hired", tone: "bg-[#e7f7ed] text-[#1b6b3a]" },
  { key: "trial_ended", label: "Trial ended", tone: "bg-[#eef2f6] text-[#34465a]" },
  { key: "dropped", label: "Dropped", tone: "bg-[#fdecec] text-[#a62121]" },
];

/* The pipeline columns share the spare width equally (flex-1 over a floor) so they spread across
   the row instead of bunching up against Updated. Role, Type and Status read left-aligned as the
   row's label; the numbers and everything after them are centred, header and cell alike. */
// A count needs little room; its label wraps to two lines ("Trial / ended") rather than widening the
// table past a 14" laptop.
const STAT = "min-w-[64px] flex-1 text-center whitespace-normal leading-tight";
const COL = { role: "w-[160px] shrink-0", type: "w-[96px] shrink-0", status: "w-[88px] shrink-0", updated: "w-[88px] shrink-0 text-center", actions: "w-[80px] shrink-0 text-center" };
const COLS = [COL.role, COL.type, COL.status, ...STATS.map(() => STAT), COL.updated, COL.actions];
const HEAD = ["Role", "Type", "Status", ...STATS.map((s) => s.label), "Updated", "Actions"];
const Edit = ICONS.edit;
const Copy = ICONS.copy;
const Trash = ICONS.trash;
const Check = ICONS.check;
const People = ICONS.people;
const Lock = ICONS.lock;
const Reopen = ICONS.retry;
const Archive = ICONS.archive;

type Confirm = { role: Role; action: "close" | "reopen" | "archive" | "delete" };

/** What each confirmation asks and explains, its button, and the toast once it's done. */
const CONFIRMS: Record<Confirm["action"], { title: (role: string) => string; description: string; button: string; done: string }> = {
  close: {
    title: (role) => `Close ${role}?`,
    description: "New applications stop and the role leaves the job board. Candidates already in the tracker keep their stage; you can reopen it any time.",
    button: "Close role",
    done: "Role closed",
  },
  reopen: {
    title: (role) => `Reopen ${role}?`,
    description: "The role goes back on the job board and matched independents are notified again.",
    button: "Reopen role",
    done: "Role reopened",
  },
  archive: {
    title: (role) => `Archive ${role}?`,
    description: "The role moves to Archived with its candidates and history. It no longer counts toward your active roles.",
    button: "Archive role",
    done: "Role archived",
  },
  delete: {
    title: (role) => `Delete ${role}?`,
    description: "Drafts were never published, so no one has seen or applied to this one. Deleting it cannot be undone.",
    button: "Delete role",
    done: "Role deleted",
  },
};

/** Live, from the tracker itself: a draft has no pipeline, so its row stays em-dashed. */
const live = (r: Role, candidates: Candidate[]) => (r.status === "Draft" ? null : candidates.filter((c) => c.role === r.slug));

/**
 * Exactly what that column holds on the role's tracker — same rule as the board (`columnOf`): a
 * dropped candidate counts only under Dropped, a closed trial only under Trial ended, everyone
 * else under their current stage's column. Trial ended is a dash on a role that has no trial,
 * as the board leaves that column out.
 */
function inColumn(r: Role, rows: Candidate[] | null, key: string) {
  if (!rows) return null;
  const n = rows.filter((c) => columnOf(c) === key).length;
  return key === "trial_ended" && r.type !== "trial" && n === 0 ? null : n;
}

/**
 * A filled cell rather than a pill: the tone covers the whole column cell, top to bottom, so a
 * row reads as a band of pipeline colour. The cell links to the role's tracker with that column
 * in focus. A draft has no pipeline, so it gets a plain dash and no link.
 */
function Stat({ value, tone, href, label }: { value: number | null; tone: string; href: string; label: string }) {
  if (value === null) return <span className="flex w-full items-center justify-center text-[14px] text-ink-2">—</span>;
  return (
    <Link
      href={href}
      aria-label={`${value} ${label} — open in the pipeline`}
      className={`flex w-full items-center justify-center text-[13px] leading-[1.2] font-medium hover:brightness-95 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${tone}`}
    >
      {value}
    </Link>
  );
}

/**
 * The Role column is kept narrow so the pipeline gets the width; a long title ellipsises and shows
 * in full on hover or focus. The tip only arms when the text is actually clipped, so a short title
 * doesn't pop a bubble repeating what's already there. It's measured up front (and on resize) rather
 * than on pointer-enter: a tip still off when the pointer arrives never opens on that hover.
 */
function RoleTitle({ role }: { role: Role }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setClipped(el.scrollWidth > el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [role.title]);
  return (
    <Tip label={role.title} off={!clipped}>
      <Link ref={ref} href={`/team/hire/roles/${role.slug}`} className="min-w-0 truncate text-[14px] font-medium text-primary hover:underline">
        {role.title}
      </Link>
    </Tip>
  );
}

export default function AllRoles() {
  const { candidates } = usePipeline();
  const { roles } = useRoles();
  const filters = useRoleFilters(roles);
  const [toast, setToast] = useToast();
  const actions = useRoleActions(setToast);
  const { list } = filters;

  return (
    <Page title="All roles">
      <div className="flex min-h-full w-full flex-col gap-6">
        <RolesToolbar roles={roles} filters={filters} />

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
        <Table cols={COLS} head={HEAD}>
          {list.map((r) => (
            <RoleRow key={r.slug} r={r} candidates={candidates} actions={actions} />
          ))}
          {list.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">No roles match these filters.</p>}
        </Table>
        )}
      </div>

      <ConfirmDialog confirm={actions.confirm} onClose={() => actions.setConfirm(null)} onConfirm={actions.apply} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The search and the status and type filters, and the roles they leave. */
function useRoleFilters(roles: Role[]) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [type, setType] = useState("All types");
  const list = roles.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "All statuses" && r.status !== status) return false;
    if (type !== "All types" && JOB_TYPE_LABEL[r.type] !== type) return false;
    return true;
  });
  return { q, setQ, status, setStatus, type, setType, list };
}

type RoleFilters = ReturnType<typeof useRoleFilters>;

/**
 * What the row menus do: which menu is open, the two actions that happen straight from it
 * (duplicate, publish a draft), and the close / reopen / archive / delete confirmation.
 */
function useRoleActions(setToast: SetToast) {
  const { setRoleStatus, removeRole, duplicateRole, canPublish } = useRoles();
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const router = useRouter();

  const duplicate = (r: Role) => {
    setMenu(null);
    const copy = duplicateRole(r.slug);
    setToast(copy ? `${r.title} duplicated as a draft` : "Could not duplicate that role", copy ? "success" : "danger");
  };

  /** TB-035 — incomplete drafts can't go live; send the user back to finish them instead. */
  const publishDraft = (r: Role) => {
    setMenu(null);
    if (!canPublish) {
      setToast("Finish your company profile and add a payment method before publishing", "danger");
      router.push("/team/profile/company");
      return;
    }
    if (!draftReady(r)) {
      setToast("Some required fields are still empty — opening the draft so you can finish it", "danger");
      router.push(`/team/hire/new?edit=${r.slug}`);
      return;
    }
    // TB-035 — a copy opens on Review first, so it isn't published as "… (copy)" by accident.
    if (r.duplicatedFrom) {
      router.push(`/team/hire/new?edit=${r.slug}`);
      return;
    }
    setRoleStatus(r.slug, "Active");
    setToast(`${r.title} is now live`);
  };

  const apply = () => {
    if (!confirm) return;
    const { role, action } = confirm;
    if (action === "reopen" && !canPublish) {
      setConfirm(null);
      setToast("Finish your company profile and add a payment method before reopening a role", "danger");
      return;
    }
    if (action === "delete") removeRole(role.slug);
    else setRoleStatus(role.slug, action === "close" ? "Closed" : action === "reopen" ? "Active" : "Archived");
    setToast(CONFIRMS[action].done);
    setConfirm(null);
  };

  /** Opens the confirmation for one role, closing its menu. */
  const ask = (role: Role, action: Confirm["action"]) => {
    setConfirm({ role, action });
    setMenu(null);
  };
  return { menu, setMenu, confirm, setConfirm, ask, duplicate, publishDraft, apply };
}

type RoleActions = ReturnType<typeof useRoleActions>;

/** How many roles are live, drafted and closed, the search and filters, and Create role. */
function RolesToolbar({ roles, filters }: { roles: Role[]; filters: RoleFilters }) {
  const { q, setQ, status, setStatus, type, setType } = filters;
  const count = (s: RoleStatus) => roles.filter((r) => r.status === s).length;
  return (
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
      <Select options={["All types", "Trial", "Full-time", "Part-time"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[190px]" />
    </Toolbar>
  );
}

/** One role: its title, type and status, a count per tracker column, when it was posted, and its menu. */
function RoleRow({ r, candidates, actions }: { r: Role; candidates: Candidate[]; actions: RoleActions }) {
  const rows = live(r, candidates);
  return (
    <Row>
      <span className={`${COL.role} flex items-center`}>
        <RoleTitle role={r} />
      </span>
      <span className={`${COL.type} flex`}>
        <JobBadge type={r.type} />
      </span>
      <span className={COL.status}>
        <StatusDot tone={ROLE_STATUS[r.status]}>{r.status}</StatusDot>
      </span>
      {/* TB-026: stats read as coloured cells while the role is live and grey once it
          isn't, so a closed role doesn't look like it's still collecting people. */}
      {STATS.map((s) => (
        /* !p-0 + items-stretch: the fill covers the grid cell edge to edge. */
        // A white hairline between the fills keeps the band reading column by column.
        <span key={s.key} className={`${STAT} flex !items-stretch border-l border-white !p-0`}>
          <Stat
            value={inColumn(r, rows, s.key)}
            tone={r.status === "Active" ? s.tone : "bg-[#eeeeee] text-ink-2"}
            href={`/team/hire/roles/${r.slug}?stage=${s.key}`}
            label={s.label}
          />
        </span>
      ))}
      {/* TB-026: a draft has no posted date. */}
      <span className={`${COL.updated} text-ink-2`}>{r.status === "Draft" ? "—" : shortDayLabel(r.updated)}</span>
      <span className={`${COL.actions} flex justify-center`}>
        <KebabMenu
          label="Role actions"
          open={actions.menu === r.slug}
          onOpenChange={(open) => actions.setMenu(open ? r.slug : null)}
          iconSize={20}
          menuWidth={220}
          buttonClassName="!size-7"
        >
          {r.status === "Draft" ? <DraftItems r={r} actions={actions} /> : <PostedItems r={r} actions={actions} />}
        </KebabMenu>
      </span>
    </Row>
  );
}

/** A draft's menu: finish it, duplicate it, publish it once it's complete, or delete it. */
function DraftItems({ r, actions }: { r: Role; actions: RoleActions }) {
  return (
    <>
      <MenuLink href={`/team/hire/new?type=${r.type}&edit=${r.slug}`} icon={<Edit size={18} aria-hidden />}>
        Continue editing
      </MenuLink>
      <MenuAction onClick={() => actions.duplicate(r)} icon={<Copy size={18} aria-hidden />}>
        Duplicate
      </MenuAction>
      {/* TB-035: publish straight from the list, but only once the draft is complete. */}
      <MenuAction onClick={() => actions.publishDraft(r)} icon={<Check size={18} aria-hidden />}>
        Publish
      </MenuAction>
      <MenuAction destructive onClick={() => actions.ask(r, "delete")} icon={<Trash size={18} aria-hidden />}>
        Delete draft
      </MenuAction>
    </>
  );
}

/** A posted role's menu: its candidates, a duplicate, and closing or reopening and archiving it. */
function PostedItems({ r, actions }: { r: Role; actions: RoleActions }) {
  return (
    <>
      <MenuLink href={`/team/hire/roles/${r.slug}`} icon={<People size={18} aria-hidden />}>
        View candidates
      </MenuLink>
      {/* TB-032: duplicating is offered on any post, not just drafts. */}
      <MenuAction onClick={() => actions.duplicate(r)} icon={<Copy size={18} aria-hidden />}>
        Duplicate
      </MenuAction>
      {r.status === "Active" ? (
        <MenuAction onClick={() => actions.ask(r, "close")} icon={<Lock size={18} aria-hidden />}>
          Close role
        </MenuAction>
      ) : (
        <MenuAction onClick={() => actions.ask(r, "reopen")} icon={<Reopen size={18} aria-hidden />}>
          Reopen role
        </MenuAction>
      )}
      {r.status !== "Archived" && (
        <MenuAction onClick={() => actions.ask(r, "archive")} icon={<Archive size={18} aria-hidden />}>
          Archive role
        </MenuAction>
      )}
    </>
  );
}

/** Closing, reopening, archiving or deleting one role, once confirmed. */
function ConfirmDialog({ confirm, onClose, onConfirm }: { confirm: Confirm | null; onClose: () => void; onConfirm: () => void }) {
  const copy = confirm ? CONFIRMS[confirm.action] : null;
  return (
    <Modal
      open={!!confirm}
      onClose={onClose}
      tone={confirm?.action === "delete" ? "danger" : "default"}
      title={confirm && copy ? copy.title(confirm.role.title) : ""}
      description={copy ? copy.description : ""}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant={confirm?.action === "delete" ? "danger" : "primary"} onClick={onConfirm}>
            {copy ? copy.button : ""}
          </Button>
        </>
      }
    />
  );
}
