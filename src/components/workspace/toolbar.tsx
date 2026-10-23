"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ASSIGNEE_KEYS, PRIORITY_META, STATUS_META, STATUSES, TYPE_META, WORK_TYPES, type AssigneeKey, type WorkType } from "@/lib/work/model";
import { activeFilterCount, DUE_FILTERS, DUE_LABEL, EMPTY_FILTERS, GROUP_LABEL, GROUPS, PRIORITY_FILTERS, SORT_LABEL, SORTS, type Filters, type WorkQuery } from "@/lib/work/query";
import { TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { TYPE_ICON } from "./labels";

/**
 * The toolbar every view shares: search, filters, sort and grouping. It all lives in the URL, so
 * switching views keeps it, a reload keeps it, and a link opens the same list.
 */

/** On a phone 40px, the height of the view tabs and the search there, for a thumb. */
const BUTTON = `${TOOLBAR_BUTTON} max-md:h-10 max-md:min-w-10 max-md:justify-center`;

type Props = {
  query: WorkQuery;
  setQuery: (p: Partial<WorkQuery>) => void;
  assigneeLabel: (k: AssigneeKey) => string;
  /** Every tag in use, for the tag filter. */
  tags: string[];
  /** Items shown, and how many there are before filtering. */
  shown: number;
  total: number;
  groupable: boolean;
  /** TB-148 — projects are on (a role, not a trial): grouping by project is offered. */
  projects?: boolean;
  sortable: boolean;
};

export function Toolbar(props: Props) {
  const { query, setQuery } = props;
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Search, filter, sort and group">
      <Search value={query.q} onChange={(q) => setQuery({ q })} />
      <ToolbarMenus {...props} />
    </div>
  );
}

/**
 * Filter, Sort and Group, then the count. A phone shows the three as their icons (each keeps its name
 * in its aria-label) and leaves the count to screen readers; it puts them on a row of their own under
 * its pinned view tabs and search (the workspace's PhoneHead).
 */
export function ToolbarMenus({ query, setQuery, assigneeLabel, tags, shown, total, groupable, projects = false, sortable }: Props) {
  return (
    <>
      <FilterMenu query={query} setQuery={setQuery} assigneeLabel={assigneeLabel} tags={tags} />
      {sortable && <SortMenu query={query} setQuery={setQuery} />}
      {groupable && <GroupMenu query={query} setQuery={setQuery} projects={projects} />}
      <span className="ml-auto text-[13px] leading-[1.4] whitespace-nowrap text-ink-2 tabular-nums max-sm:sr-only" aria-live="polite">
        {shown === total ? `${total} ${total === 1 ? "item" : "items"}` : `${shown} of ${total} items`}
        {query.archived && " · deleted"}
      </span>
    </>
  );
}

/** The Filter menu: a submenu for each field, then Blocked only and Show deleted. The button counts what's on. */
function FilterMenu({ query, setQuery, assigneeLabel, tags }: Pick<Props, "query" | "setQuery" | "assigneeLabel" | "tags">) {
  const active = activeFilterCount({ ...query, q: "" });
  const toggle = <K extends keyof Filters>(key: K, value: Filters[K] extends (infer V)[] ? V : never) => {
    const list = query[key] as unknown as string[];
    setQuery({ [key]: list.includes(value as string) ? list.filter((v) => v !== value) : [...list, value] } as Partial<WorkQuery>);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={BUTTON} aria-label={active ? `Filter, ${active} active` : "Filter"}>
        <ICONS.filter size={17} aria-hidden /> <span className="max-sm:hidden">Filter</span>
        {/* A round 20px count, its number centred — it was a text-height pill that sat off the button's middle. */}
        {active > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-white"><span className="badge-count">{active}</span></span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <FilterChecks label="Status" picked={query.status} onToggle={(s) => toggle("status", s)} options={STATUSES.map((s) => ({ value: s, text: STATUS_META[s].label }))} />
        <FilterChecks label="Assignee" picked={query.assignee} onToggle={(k) => toggle("assignee", k)} options={ASSIGNEE_KEYS.map((k) => ({ value: k, text: assigneeLabel(k) }))} />
        <FilterChecks label="Work type" picked={query.type} onToggle={(k) => toggle("type", k)} options={WORK_TYPES.map((k) => ({ value: k, text: <TypeName type={k} /> }))} />
        <FilterChecks label="Priority" picked={query.priority} onToggle={(p) => toggle("priority", p)} options={PRIORITY_FILTERS.map((p) => ({ value: p, text: p === "none" ? "No priority" : PRIORITY_META[p].label }))} />
        <FilterChecks label="Due date" picked={query.due} onToggle={(d) => toggle("due", d)} options={DUE_FILTERS.map((d) => ({ value: d, text: DUE_LABEL[d] }))} />
        {tags.length > 0 && <FilterChecks label="Tags" picked={query.tag} onToggle={(t) => toggle("tag", t)} options={tags.map((t) => ({ value: t, text: <TagName tag={t} /> }))} />}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={query.blocked} onCheckedChange={(v) => setQuery({ blocked: v })} closeOnClick={false}>
          <ICONS.blocked size={15} aria-hidden className="text-ink-2" /> Blocked only
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={query.archived} onCheckedChange={(v) => setQuery({ archived: v })} closeOnClick={false}>
          <ICONS.trash size={15} aria-hidden className="text-ink-2" /> Show deleted instead
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One filter's submenu: a checkbox per value, ticked when it's picked, that turns it on or off — the menu stays open. */
function FilterChecks<V extends string>({ label, picked, onToggle, options }: { label: string; picked: readonly V[]; onToggle: (v: V) => void; options: readonly { value: V; text: ReactNode }[] }) {
  const on = new Set<string>(picked);
  return (
    <FilterSub label={label} count={picked.length}>
      {options.map(({ value, text }) => (
        <DropdownMenuCheckboxItem key={value} checked={on.has(value)} onCheckedChange={() => onToggle(value)} closeOnClick={false}>
          {text}
        </DropdownMenuCheckboxItem>
      ))}
    </FilterSub>
  );
}

/** A work type in the filter: its icon, then its name. */
function TypeName({ type }: { type: WorkType }) {
  const Icon = ICONS[TYPE_ICON[type]];
  return (
    <>
      <Icon size={15} aria-hidden className="text-ink-2" /> {TYPE_META[type].label}
    </>
  );
}

/** A tag in the filter: the tag mark, then its name. */
function TagName({ tag }: { tag: string }) {
  return (
    <>
      <ICONS.tag size={14} aria-hidden className="text-ink-2" /> {tag}
    </>
  );
}

/** The Sort menu: what to sort by, and which way for anything but Manual. */
function SortMenu({ query, setQuery }: Pick<Props, "query" | "setQuery">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={BUTTON} aria-label={`Sort: ${SORT_LABEL[query.sort]}${query.sort === "manual" ? "" : `, ${query.dir === "asc" ? "ascending" : "descending"}`}`}>
        <ICONS.sort size={17} aria-hidden /> <span className="max-sm:hidden">Sort: {SORT_LABEL[query.sort]}</span>
        {query.sort !== "manual" && <ICONS.arrowUp size={14} aria-hidden className={query.dir === "desc" ? "rotate-180" : ""} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={query.sort} onValueChange={(v) => setQuery({ sort: v as WorkQuery["sort"] })}>
            {SORTS.map((s) => (
              <DropdownMenuRadioItem key={s} value={s} closeOnClick>
                {SORT_LABEL[s]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {query.sort !== "manual" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Direction</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={query.dir} onValueChange={(v) => setQuery({ dir: v as WorkQuery["dir"] })}>
                <DropdownMenuRadioItem value="asc" closeOnClick>
                  Ascending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc" closeOnClick>
                  Descending
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The Group menu. Grouping by project is offered only where there are projects. */
function GroupMenu({ query, setQuery, projects }: Pick<Props, "query" | "setQuery"> & { projects: boolean }) {
  /** On a trial there are no projects: a link grouped by project groups by status, and says so. */
  const shownGroup = !projects && query.group === "project" ? "status" : query.group;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={BUTTON} aria-label={`Group by: ${GROUP_LABEL[shownGroup]}`}>
        <ICONS.group size={17} aria-hidden /> <span className="max-sm:hidden">Group: {GROUP_LABEL[shownGroup]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={shownGroup} onValueChange={(v) => setQuery({ group: v as WorkQuery["group"] })}>
            {GROUPS.filter((g) => projects || g !== "project").map((g) => (
              <DropdownMenuRadioItem key={g} value={g} closeOnClick>
                {GROUP_LABEL[g]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One filter's submenu. No count chip on the row: it crowded the submenu arrow, and the Filter
 * button already says how many are on. The count still reaches screen readers in the row's name.
 */
function FilterSub({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger aria-label={count > 0 ? `${label}, ${count} selected` : label}>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 w-56">{children}</DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * The search box's shape. In the toolbar: up to 280px, a row of its own on a small phone. `compact`
 * (beside a phone's view tabs, PhoneHead): only the glass, a 40px square like the buttons beside it,
 * until it's tapped and takes the row; with a search in it, what room the tabs leave.
 */
function searchBox(compact: boolean, empty: boolean) {
  if (!compact) return "h-9 w-full max-w-[280px] min-w-32 flex-1 gap-2 px-3 max-sm:max-w-none sm:w-auto";
  return empty ? "ml-auto h-10 w-10 shrink-0 justify-center focus-within:w-auto focus-within:flex-1 focus-within:justify-start focus-within:gap-2 focus-within:px-3" : "h-10 min-w-0 flex-1 gap-2 px-3";
}

/**
 * Search as you type; the URL follows a moment after the typing stops. The input fills its box's
 * height on a phone, so a tap anywhere on the box lands in it.
 */
export function Search({ value, onChange, compact = false }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [text, set] = useSearchText(value, onChange);
  const folded = compact && !text;
  return (
    <label className={`group/search flex items-center rounded-lg border border-border bg-white text-ink-2 focus-within:border-primary ${searchBox(compact, !text)}`}>
      <ICONS.search size={17} aria-hidden className="shrink-0" />
      <input
        type="search"
        value={text}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") set(text, true);
          if (e.key === "Escape" && text) {
            e.preventDefault();
            set("", true);
          }
        }}
        placeholder="Search work"
        aria-label="Search work by name, description, tag or #number"
        className={`min-w-0 flex-1 bg-transparent text-[13.5px] leading-[1.2] text-ink outline-none placeholder:text-ink-2 max-md:self-stretch [&::-webkit-search-cancel-button]:hidden ${folded ? "w-0 flex-none focus:w-auto focus:flex-1" : ""}`}
      />
      {/* Folded beside the tabs, a search keeps its clear for while it's being typed in: the chip under the
          toolbar clears it otherwise. A press there keeps the focus in the box, so the clear stays to be
          tapped (Safari doesn't focus a tapped button) and the typing can go on. */}
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={compact ? (e) => e.preventDefault() : undefined}
          onClick={() => set("", true)}
          className={`hit-area size-5 shrink-0 items-center justify-center rounded-full text-ink-2 [--hit:32px] hover:bg-surface-alt hover:text-ink ${compact ? "hidden group-focus-within/search:flex" : "flex"}`}
        >
          <ICONS.close size={15} aria-hidden />
        </button>
      )}
    </label>
  );
}

/** The text as typed, and setting it: the URL (`onChange`) follows a moment after the typing stops, or at once (`now`); a change from outside (Back, Clear all) shows. */
function useSearchText(value: string, onChange: (v: string) => void) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Back/Forward or "Clear all" changed it from outside: show that.
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const set = (v: string, now = false) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    if (now) {
      setSeen(v);
      onChange(v);
    } else
      timer.current = setTimeout(() => {
        setSeen(v);
        onChange(v);
      }, 250);
  };
  return [text, set] as const;
}

/** Each filter as a chip that removes it, and Clear all. */
export function FilterChips({ query, setQuery, assigneeLabel }: { query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; assigneeLabel: (k: AssigneeKey) => string }) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (query.q.trim()) chips.push({ key: "q", label: `Search: “${query.q.trim()}”`, clear: () => setQuery({ q: "" }) });
  for (const s of query.status) chips.push({ key: `s-${s}`, label: `Status: ${STATUS_META[s].label}`, clear: () => setQuery({ status: query.status.filter((x) => x !== s) }) });
  for (const a of query.assignee) chips.push({ key: `a-${a}`, label: `Assignee: ${assigneeLabel(a)}`, clear: () => setQuery({ assignee: query.assignee.filter((x) => x !== a) }) });
  for (const t of query.type) chips.push({ key: `t-${t}`, label: `Type: ${TYPE_META[t].label}`, clear: () => setQuery({ type: query.type.filter((x) => x !== t) }) });
  for (const p of query.priority) chips.push({ key: `p-${p}`, label: `Priority: ${p === "none" ? "None" : PRIORITY_META[p].label}`, clear: () => setQuery({ priority: query.priority.filter((x) => x !== p) }) });
  for (const d of query.due) chips.push({ key: `d-${d}`, label: DUE_LABEL[d], clear: () => setQuery({ due: query.due.filter((x) => x !== d) }) });
  for (const t of query.tag) chips.push({ key: `g-${t}`, label: `Tag: ${t}`, clear: () => setQuery({ tag: query.tag.filter((x) => x !== t) }) });
  if (query.blocked) chips.push({ key: "blocked", label: "Blocked only", clear: () => setQuery({ blocked: false }) });
  if (query.archived) chips.push({ key: "archived", label: "Showing deleted", clear: () => setQuery({ archived: false }) });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters" role="group">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-bg pr-1 pl-3 text-[12.5px] leading-[1.2] font-medium text-accent-ink">
          {c.label}
          <button type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`} className="hit-area flex size-5 items-center justify-center rounded-full [--hit:32px] hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-primary">
            <ICONS.close size={13} aria-hidden />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => setQuery({ ...EMPTY_FILTERS, q: "" })} className="h-7 rounded-full px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
        Clear all
      </button>
    </div>
  );
}
