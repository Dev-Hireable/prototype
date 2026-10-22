"use client";

import Link from "next/link";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import type { Day } from "@/lib/work/dates";
import { refOf, STATUS_META, type WorkItem } from "@/lib/work/model";
import type { Names } from "@/lib/work/permissions";
import { firstName } from "./labels";
import { DueChip } from "./meta";

/** How a card opens its task: a link to the contract's Work tab (Messages), or a press that opens its sheet (a comment beside it). */
export type TaskOpener = { href: string } | { onOpen: () => void };

/**
 * White on any bubble, like a sent file's card, so it reads the same in a blue bubble and a grey one;
 * its own colour and wrapping, not the bubble's white text and kept line breaks.
 */
const CARD = "flex w-80 max-w-full flex-col gap-1.5 rounded-lg bg-white px-3 py-2.5 text-left whitespace-normal text-ink outline -outline-offset-1 outline-border transition hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:outline-primary";

/**
 * The tasks a comment or a message names, by a pasted link or a typed "#4", as cards under it, the way
 * a chat app previews a link: the number and name, the status, due date and who has it, then the start
 * of the description. Each card opens its task (`open`). No tooltips inside: a card is one link.
 */
export function TaskPreviews({ tasks, today, names, open }: { tasks: readonly WorkItem[]; today: Day; names: Names; open: (t: WorkItem) => TaskOpener }) {
  if (!tasks.length) return null;
  return (
    <ul aria-label="Linked tasks" className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id} className="min-w-0">
          <TaskPreview item={t} today={today} names={names} open={open(t)} />
        </li>
      ))}
    </ul>
  );
}

function TaskPreview({ item: t, today, names, open }: { item: WorkItem; today: Day; names: Names; open: TaskOpener }) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <StatusCircle status={t.status} size={16} />
        <span className="flex min-w-0 items-baseline gap-1.5 leading-[1.3] tracking-[0.2px]">
          <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
          <span className="truncate text-[14px] font-medium text-ink">{t.title}</span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-[1.2] text-ink-2">
        <span>{STATUS_META[t.status].label}</span>
        <DueChip item={t} today={today} />
        <span>{t.assignee ? firstName(names[t.assignee]) : "Unassigned"}</span>
      </span>
      {t.description && <span className="line-clamp-2 text-[12.5px] leading-[1.4] text-ink-2">{t.description}</span>}
    </>
  );
  if ("href" in open)
    return (
      <Link href={open.href} className={CARD}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={open.onOpen} className={CARD}>
      {body}
    </button>
  );
}
