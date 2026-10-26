"use client";

import { Fragment, useState } from "react";
import { ICONS } from "@/components/icons";
import { FileTiles } from "@/components/portal/attachments";
import { DayDivider } from "@/components/portal/day-divider";
import { Tip } from "@/components/portal/tip";
import { Avatar } from "@/components/portal/ui";
import { keyed } from "@/lib/portal/keys";
import { stampLabel, type Day } from "@/lib/work/dates";
import { refOf, type WorkComment, type WorkItem } from "@/lib/work/model";
import { sideOf } from "@/lib/work/permissions";
import { taskOf, taskRefParts, tasksNamed, type TextPart } from "@/lib/work/refs";
import { useWorkspace } from "./context";
import { TaskPreviews } from "./task-preview";

/** Something that happened to the item, from its log. */
export type FeedEvent = { kind: "event"; ts: number; at: string; text: string };
/** What someone said on it. */
export type FeedComment = { kind: "comment" } & WorkComment;
/** Three or more moves in a row by one person — to and fro between columns — told as one line. */
type FeedMoves = { kind: "moves"; ts: number; at: string; who: string; moves: FeedEvent[] };
type FeedRow = FeedEvent | FeedComment | FeedMoves;

/** How many rows a long stream opens on — its latest, nearest the comment box. */
const FEED_LATEST = 12;

/** Comments one person sends within five minutes of each other run on under one header, as in a chat. */
const SAME_TURN = 5 * 60_000;

const MOVED = /^Moved to (.+) by (.+)$/;
const mover = (f: FeedEvent | FeedComment) => (f.kind === "event" ? (MOVED.exec(f.text)?.[2] ?? null) : null);

/** Folds each run of three or more moves by the same person into one row; shorter runs stay as they are. */
function foldMoves(feed: readonly (FeedEvent | FeedComment)[]): FeedRow[] {
  const rows: FeedRow[] = [];
  let run: FeedEvent[] = [];
  const flush = () => {
    if (run.length >= 3) rows.push({ kind: "moves", ts: run[0].ts, at: run.at(-1)!.at, who: mover(run[0])!, moves: run });
    else rows.push(...run);
    run = [];
  };
  for (const f of feed) {
    const who = mover(f);
    if (who === null || (run.length > 0 && mover(run[0]) !== who)) flush();
    if (who === null) rows.push(f);
    else run.push(f as FeedEvent);
  }
  flush();
  return rows;
}

/** "19 Oct 2026, 1:43 AM" → its day and its time; a stamp with no time is all day. */
function split(at: string): { day: string; time: string } {
  const i = at.lastIndexOf(", ");
  return i > 0 && /\d:\d\d/.test(at.slice(i)) ? { day: at.slice(0, i), time: at.slice(i + 2) } : { day: at, time: "" };
}

/** A day's name: Today or Yesterday when it's one of those, the date otherwise. */
function dayHeading(day: string, today: Day) {
  const same = (d: Day) => day === stampLabel(d) || day === stampLabel(d).replace(/^0/, "");
  return same(today) ? "Today" : same(today - 1) ? "Yesterday" : day;
}

const rowKey = (f: FeedRow) => (f.kind === "comment" ? (f.id ?? `c-${f.ts}`) : f.kind === "moves" ? `m-${f.ts}` : `e-${f.ts}`);

/** A comment that carries on its author's last one — same person, same day, within five minutes — and skips the header. */
const runsOn = (f: FeedRow, prev: FeedRow | undefined, newDay: boolean) => !newDay && prev?.kind === "comment" && f.kind === "comment" && prev.side === f.side && prev.name === f.name && f.ts - prev.ts <= SAME_TURN;

/**
 * The item's activity as a work chat shows it: one stream, oldest at the top, a divider where a new
 * day starts. What people said are chat turns — photo, name and time over the words, which sit on
 * the panel, not in boxes; what happened runs between them as quiet one-line notes, with to-and-fro
 * moves folded into one. A long stream opens on its latest rows, the earlier ones behind "Show earlier".
 * An item someone names, by its pasted link or a typed "#4", opens from what they said and shows as a
 * card under it (`items`, the contract's).
 */
export function ActivityStream({ feed, items, empty }: { feed: readonly (FeedEvent | FeedComment)[]; items: readonly WorkItem[]; empty: string }) {
  const { today } = useWorkspace();
  const [all, setAll] = useState(false);
  const rows = foldMoves(feed);
  if (rows.length === 0) return <p className="py-6 text-center text-[13px] leading-[1.45] text-ink-2">{empty}</p>;
  const hidden = all ? 0 : Math.max(0, rows.length - FEED_LATEST);
  const shown = rows.slice(hidden);
  const days = shown.map((f) => split(f.at).day);
  return (
    <div className="flex flex-col gap-1">
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)} className="flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-[13px] font-medium text-accent-ink hover:bg-surface-2">
          <ICONS.chevron size={16} aria-hidden className="rotate-180" />
          Show {hidden} earlier
        </button>
      )}
      <ol aria-label="Activity history" className="flex flex-col">
        {keyed(shown, rowKey).map(({ item: f, key }, i) => {
          const newDay = i === 0 || days[i] !== days[i - 1];
          const on = runsOn(f, shown[i - 1], newDay);
          return (
            <li key={key} className={f.kind === "comment" ? (on ? "pt-1" : "pt-3") : "pt-2"}>
              {newDay && <DayDivider label={dayHeading(days[i], today)} className="pt-1 pb-2" />}
              {f.kind === "comment" ? <Turn comment={f} runsOn={on} items={items} /> : f.kind === "moves" ? <MovesNote run={f} /> : <EventNote event={f} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A note's mark, in the photos' column so the stream reads as one: a small ring, lighter than a photo. */
function NoteMark() {
  return (
    <span aria-hidden className="flex w-8 shrink-0 justify-center pt-[5px]">
      <span className="size-2 rounded-full border-[1.5px] border-[#c3c3c3]" />
    </span>
  );
}

/** "Moved to In progress" a shade darker than "by Juan Dela Cruz": what happened reads first. */
function NoteText({ text }: { text: string }) {
  const i = text.lastIndexOf(" by ");
  if (i < 0) return <span className="text-ink-2">{text}</span>;
  return (
    <>
      <span className="text-ink-2">{text.slice(0, i)}</span> <span className="text-muted-2">{text.slice(i + 1)}</span>
    </>
  );
}

/** What happened: a quiet line between the turns, its time at the right. */
function EventNote({ event: f }: { event: FeedEvent }) {
  return (
    <div className="flex gap-3 text-[12.5px] leading-[1.45]">
      <NoteMark />
      <p className="min-w-0 flex-1">
        <NoteText text={f.text} />
      </p>
      <time className="shrink-0 text-[12px] leading-[1.5] text-muted-2 tabular-nums">{split(f.at).time}</time>
    </div>
  );
}

/** A run of moves as one note — how many, by whom, where it ended up and when the last was — opening onto each move. */
function MovesNote({ run }: { run: FeedMoves }) {
  const [open, setOpen] = useState(false);
  const now = MOVED.exec(run.moves.at(-1)!.text)?.[1];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-3 text-[12.5px] leading-[1.45]">
        <NoteMark />
        <p className="min-w-0 flex-1">
          <span className="text-ink-2">
            Moved {run.moves.length} times{now ? `, now ${now}` : ""}
          </span>{" "}
          <span className="text-muted-2">by {run.who}</span>{" "}
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded font-medium whitespace-nowrap text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            {open ? "Hide" : "Show"}
          </button>
        </p>
        <time className="shrink-0 text-[12px] leading-[1.5] text-muted-2 tabular-nums">{split(run.at).time}</time>
      </div>
      {open && (
        <ol aria-label={`${run.moves.length} moves by ${run.who}`} className="ml-11 flex flex-col gap-1 border-l border-border pl-3">
          {keyed(run.moves, (e) => `e-${e.ts}`).map(({ item: e, key }) => (
            <li key={key} className="flex gap-3 text-[12px] leading-[1.45] text-ink-2">
              <span className="min-w-0 flex-1">{MOVED.exec(e.text)?.[1] ?? e.text}</span>
              <time className="shrink-0 text-muted-2 tabular-nums">{split(e.at).time}</time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * What someone wrote, with each item on this contract it names a link that opens it in its sheet, the
 * item's name in the tip: a typed "#4" as typed, a pasted link as the item's name rather than its
 * address. Any other "#n" or link stays as written.
 */
function TaskRefText({ parts, items }: { parts: readonly TextPart[]; items: readonly WorkItem[] }) {
  const { openTask } = useWorkspace();
  return keyed(parts, (p) => p.text).map(({ item: p, key }) => {
    const t = taskOf(p, items);
    if (!t) return <Fragment key={key}>{p.text}</Fragment>;
    const name = `${refOf(t)} ${t.title}`;
    return (
      <Tip key={key} label={name}>
        <button type="button" aria-label={name} onClick={() => openTask(t.id)} className="rounded font-medium text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          {p.taskId ? t.title : p.text}
        </button>
      </Tip>
    );
  });
}

/**
 * What someone said, as a chat turn: photo, name and time over the words. A turn running on from the
 * same person's last one drops the header, its time showing in the photo's column on hover. Each
 * comment is its own article, so it's still found and read one by one.
 */
function Turn({ comment: c, runsOn, items }: { comment: FeedComment; runsOn: boolean; items: readonly WorkItem[] }) {
  const { actor, people, names, today, openTask } = useWorkspace();
  /** Which side the reader is on: their own turns say so. */
  const me = sideOf(actor);
  const name = c.name || people[c.side].name;
  const time = split(c.at).time || c.at;
  /** What they said, around the items it names: those are links in the words and cards under them. */
  const parts = c.text ? taskRefParts(c.text) : [];
  const named = tasksNamed(parts, items);
  return (
    <article aria-label={`Comment from ${name}`} className="group/msg flex gap-3">
      {runsOn ? (
        <time className="w-8 shrink-0 pt-0.5 text-center text-[10.5px] leading-[1.5] text-muted-2 tabular-nums opacity-0 group-hover/msg:opacity-100">{time.replace(/ [AP]M$/, "")}</time>
      ) : (
        <Avatar src={people[c.side].avatar} size={32} />
      )}
      <div className="min-w-0 flex-1">
        {!runsOn && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-[1.3]">
            <span className="font-semibold text-ink">{name}</span>
            {c.side === me && <span className="text-[12px] text-ink-2">(you)</span>}
            <time className="text-[12px] text-muted-2 tabular-nums">{time}</time>
          </p>
        )}
        {c.text && (
          <p className={`text-[14px] leading-[1.5] whitespace-pre-line text-ink [overflow-wrap:anywhere] ${runsOn ? "" : "mt-0.5"}`}>
            <TaskRefText parts={parts} items={items} />
          </p>
        )}
        {named.length > 0 && (
          <div className="mt-2">
            <TaskPreviews tasks={named} today={today} names={names} open={(t) => ({ onOpen: () => openTask(t.id) })} />
          </div>
        )}
        {/* What was sent with it: an image or a PDF opens in the viewer, a document downloads. */}
        {c.files?.length ? (
          <div className={c.text ? "mt-2" : "mt-1"}>
            <FileTiles files={c.files} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
