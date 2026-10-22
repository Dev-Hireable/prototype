"use client";

import { useState, type ReactNode } from "react";
import { MdCheckCircle, MdClose, MdExpandMore } from "react-icons/md";
import { ICON_BUTTON } from "@/components/portal/styles";
import { Button, Chip, Modal, Pills, SearchBox } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { hoursLabel } from "@/lib/contract/job-types";
import { trialLength, trialMonths } from "@/lib/portal/dates";
import { useHired } from "@/lib/team/hired";
import { levelName, ROLE_TEMPLATES, searchTemplates, TEMPLATE_CATEGORIES } from "@/lib/team/role-templates";
import type { RateSuggestion, RoleTemplate, TemplateCategory } from "@/lib/team/role-templates";
import { SOURCES } from "@/lib/team/role-catalogue";
import { FULL_WEEK, rangeText } from "@/lib/team/rates";

/**
 * Create Role templates: the role catalogue, ready to post. Picking one fills in the role's name,
 * description and skills, plus one example task on a trial; the wizard decides whether that needs
 * a confirm. They live in a dialog behind "Use a template", so the form itself stays uncluttered.
 */

/** Popular roles always lead a list — a category, All or a search — each group keeping its own order. */
const popularFirst = (list: RoleTemplate[]) => [...list.filter((t) => t.popular), ...list.filter((t) => !t.popular)];

/** The templates under a category pill: all of them, or the category's own. */
const inCategory = (c: TemplateCategory | "All") => (c === "All" ? ROLE_TEMPLATES : ROLE_TEMPLATES.filter((t) => t.category === c));

/**
 * The library: search it, narrow it by category, open a template to see what it fills in, or go
 * back to blank. `trial` says whether a template's example task goes in too.
 */
export function TemplateBrowser({ open, onClose, onPick, onClear, applied, trial }: { open: boolean; onClose: () => void; onPick: (t: RoleTemplate) => void; onClear: () => void; applied: RoleTemplate | null; trial: boolean }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const list = popularFirst(searchTemplates(q, inCategory(category)));
  const close = () => {
    setQ("");
    setCategory("All");
    onClose();
  };

  return (
    // `bare`: this dialog owns its layout, so the header — title, close, search and filters —
    // stays put while the list scrolls under it, instead of scrolling away with it.
    <Modal open={open} onClose={close} width={820} bare title="Role templates">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 border-b border-border px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[20px] leading-[1.4] font-semibold text-ink">Role templates</p>
              <p className="mt-1.5 text-[14px] leading-[1.4] text-ink-2">Open a role to see what it fills in, then use it. Every field stays editable.</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className={`${ICON_BUTTON} size-8`}>
              <MdClose size={20} aria-hidden />
            </button>
          </div>
          {applied && <AppliedTemplate template={applied} onClear={onClear} />}
          <SearchBox value={q} onChange={setQ} placeholder="Search roles, e.g. assistant, sales, designer" />
          <Pills
            aria-label="Template category"
            value={category}
            onChange={setCategory}
            options={(["All", ...TEMPLATE_CATEGORIES] as const).map((c) => ({
              value: c,
              label: (
                <>
                  {c} <span className="opacity-70">{inCategory(c).length}</span>
                </>
              ),
            }))}
          />
        </div>

        <TemplateResults list={list} query={q} applied={applied} trial={trial} onPick={onPick} />
      </div>
    </Modal>
  );
}

/** The note over the library once a template has filled in the form, with the way back to a blank one. */
function AppliedTemplate({ template, onClear }: { template: RoleTemplate; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-accent-bg px-4 py-3 text-[13px] leading-[1.4] text-accent-ink">
      <span className="flex items-center gap-2">
        <MdCheckCircle size={16} aria-hidden className="shrink-0" />
        <span>
          The form is filled from the <strong className="font-semibold">{template.title}</strong> template.
        </span>
      </span>
      <Button size="sm" onClick={onClear}>
        Start from scratch
      </Button>
    </div>
  );
}

/** The library's scrolling part: the templates that match, one open at a time — or a line saying none do. */
function TemplateResults({ list, query, applied, trial, onPick }: { list: RoleTemplate[]; query: string; applied: RoleTemplate | null; trial: boolean; onPick: (t: RoleTemplate) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
      {list.length === 0 ? (
        <p className="rounded-lg bg-[#fafafa] px-4 py-8 text-center text-[13px] leading-[1.4] text-ink-2">No templates match “{query.trim()}”. Try another word, or close this and start from scratch.</p>
      ) : (
        <ul aria-label="Templates" className="divide-y divide-border rounded-lg outline -outline-offset-1 outline-border">
          {list.map((t) => (
            <TemplateRow key={t.id} template={t} expanded={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} inUse={applied?.id === t.id} trial={trial} onPick={onPick} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One template: a row naming the role, that opens onto what it fills in. */
function TemplateRow({ template: t, expanded, onToggle, inUse, trial, onPick }: { template: RoleTemplate; expanded: boolean; onToggle: () => void; inUse: boolean; trial: boolean; onPick: (t: RoleTemplate) => void }) {
  const panel = `template-${t.id}`;
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panel}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] leading-[1.3] font-semibold text-ink">
          <span>{t.title}</span>
          {t.popular && <Badge tone="trial">Popular</Badge>}
          {inUse && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              <MdCheckCircle size={14} aria-hidden /> In use
            </span>
          )}
        </span>
        <MdExpandMore size={20} aria-hidden className={`shrink-0 text-ink-2 transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <TemplateDetails id={panel} template={t} inUse={inUse} trial={trial} onPick={onPick} />}
    </li>
  );
}

/**
 * An open template: its category, description, the skills it fills in, on a trial its example task,
 * its sources, and the button that uses it. What it fills in is all it shows: no trial length and
 * no pay, which the Team Builder sets on their own.
 */
function TemplateDetails({ id, template: t, inUse, trial, onPick }: { id: string; template: RoleTemplate; inUse: boolean; trial: boolean; onPick: (t: RoleTemplate) => void }) {
  return (
    <div id={id} className="flex flex-col gap-3 px-4 pb-4 text-[13px] leading-[1.4]">
      <p className="text-[12px] text-ink-2">{t.category}</p>
      <p className="text-ink-2">{t.description}</p>
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold text-ink">Skills it fills in</span>
        <span className="flex flex-wrap gap-1.5">
          {t.skills.map((s) => (
            <Chip key={s} size="sm">
              {s}
            </Chip>
          ))}
        </span>
        {t.moreSkills.length > 0 && <span className="text-[12px] text-ink-2">Also useful: {t.moreSkills.join(", ")}</span>}
      </div>
      {trial && t.task && (
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Example task</span>
          <span className="text-ink-2">{t.task.title}</span>
        </div>
      )}
      <TemplateSources template={t} />
      <div className="flex justify-end">
        <Button variant="primary" disabled={inUse} onClick={() => onPick(t)}>
          {inUse ? "In use" : "Use this template"}
        </Button>
      </div>
    </div>
  );
}

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** A cited source, by name, opening its page in a new tab. */
function SourceLink({ name }: { name: string }) {
  return (
    <a href={SOURCES[name].url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
      {name}
    </a>
  );
}

/** Where a template comes from: why the role is in demand, and who published its rates. */
function TemplateSources({ template: t }: { template: RoleTemplate }) {
  if (!t.demand && t.rateSources.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-[12px] text-ink-2">
      <span className="font-semibold text-ink">Sources</span>
      {t.demand && (
        <span>
          In demand: {t.demand.evidence} (<SourceLink name={t.demand.source} />)
        </span>
      )}
      {t.rateSources.length > 0 && (
        <span>
          Market rates:{" "}
          {t.rateSources.map((r, i) => (
            <span key={r.source}>
              {i > 0 && "; "}
              <SourceLink name={r.source} />
              {r.kind && ` (${r.kind.toLowerCase()})`}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** One labelled block in the source dialog. */
function Source({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg p-4 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
      <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{title}</p>
      {children}
    </section>
  );
}

/**
 * The budget step's "See source": where the suggested range comes from (the published market rates
 * it reads, the level it was scaled to, a part-time share, and the Independents on Hireable doing
 * this work at what rate) with the range one click away. It used to link to the Team Builder's own
 * roles list, which explained nothing.
 */
export function RateSourceModal({ open, onClose, suggestion: s, role, inUse, onUse }: { open: boolean; onClose: () => void; suggestion: RateSuggestion | null; role: string; inUse: boolean; onUse: () => void }) {
  return (
    <Modal
      open={open && !!s}
      onClose={onClose}
      closeButton
      width={560}
      title="Where this range comes from"
      description={s ? `The suggested pay for ${role || s.guide.title} is ${rangeText(s, s.hours, s.trialDays)}. Here's what it's based on.` : undefined}
      footer={
        <>
          {/* A note, not a greyed-out button: a disabled "Range in use" read like a status. */}
          {inUse && <span className="self-center text-[13px] leading-[1.4] text-ink-2 max-md:text-center">You are using this range</span>}
          <Button size="lg" onClick={onClose}>
            Close
          </Button>
          {!inUse && (
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                onUse();
                onClose();
              }}
            >
              Use this range
            </Button>
          )}
        </>
      }
    >
      {s && (
        <div className="flex flex-col gap-3">
          <GuideSource suggestion={s} role={role} />
          <PeersSource suggestion={s} />
          <p className="text-[12px] leading-[1.4] text-ink-2">This is a guide. You can set any amount.</p>
        </div>
      )}
    </Modal>
  );
}

/** The published figure the range starts from and what it covers, what it was matched on, the level it was scaled to, and a part-time share. */
function GuideSource({ suggestion: s, role }: { suggestion: RateSuggestion; role: string }) {
  const how = { template: "You started from this template.", title: `Matched on the role title “${role}”.`, skills: "Matched on the skills you picked." }[s.matched];
  return (
    <Source title="Published market rates">
      <p className="text-ink">
        {s.guide.title} · {s.guide.category} · {s.basis.level ? levelName(s.basis.level) : "all levels"}: <strong className="font-semibold">{rangeText(s.basis.range)}</strong>
      </p>
      <p className="text-ink-2">Monthly pay published for remote {s.guide.title.toLowerCase()} roles in the Philippines. {how}</p>
      {s.scaledTo && (
        <p className="text-ink-2">
          Scaled to {levelName(s.scaledTo)} experience, the level on this role: <strong className="font-semibold text-ink">{rangeText(s.fullTime)}</strong>.
        </p>
      )}
      {s.hours ? (
        <p className="text-ink-2">
          For {hoursLabel(s.hours)} of a {FULL_WEEK}-hour week: <strong className="font-semibold text-ink">{rangeText(s)}</strong>.
        </p>
      ) : null}
      {/* A trial pays one total: the monthly range for each month of the trial. */}
      {s.trialDays ? (
        <p className="text-ink-2">
          For a trial of {trialLength(s.trialDays)}, {trialMonths(s.trialDays) === 1 ? "one month" : `${trialMonths(s.trialDays)} months`} of that pay: <strong className="font-semibold text-ink">{rangeText(s, undefined, s.trialDays)}</strong>.
        </p>
      ) : null}
      {s.guide.rateSources.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-[12px] text-ink-2">
          {s.guide.rateSources.map((r) => {
            const src = SOURCES[r.source];
            return (
              <li key={r.source}>
                <SourceLink name={r.source} />
                {[src.publisher, r.kind, src.date].filter(Boolean).map((part) => ` · ${part}`)}
                {src.caveat && <span className="block">{src.caveat}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Source>
  );
}

/** The middle peer rate — the lower middle one when the count is even — or null with no peers. */
function peerMedian(s: RateSuggestion) {
  return s.peers.length ? [...s.peers].sort((a, b) => a.rate - b.rate)[Math.floor((s.peers.length - 1) / 2)].rate : null;
}

/**
 * How the median sentence ends: where the median falls against the suggested range. Their rates are
 * for a full working week, so a part-time role's median is set against the full-time range.
 */
function medianPlace(median: number, s: RateSuggestion) {
  const { min, max } = s.fullTime;
  const range = s.hours ? "the full-time range" : "the suggested range";
  return median >= min && median <= max ? `, inside ${range}.` : median < min ? `, below ${range}.` : `, above ${range}.`;
}

/** The Independents on Hireable doing this work, at their rates, and where their median falls. Named as everywhere before a hire: "Juan D.". */
function PeersSource({ suggestion: s }: { suggestion: RateSuggestion }) {
  const median = peerMedian(s);
  const { nameOf } = useHired();
  return (
    <Source title="Independents on Hireable doing this work">
      {s.peers.length === 0 ? (
        <p className="text-ink-2">No Independents with these skills yet, so the range comes from published market rates alone.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {s.peers.map((p) => (
              <li key={p.slug} className="flex items-start justify-between gap-4">
                <span className="flex flex-col">
                  <span className="font-medium text-ink">
                    {nameOf(p)} · {p.role}
                  </span>
                  <span className="text-[12px] text-ink-2">
                    {levelName(p.level)}
                    {p.shared.length > 0 && ` · shares ${p.shared.join(", ")}`}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{money(p.rate)} /month</span>
              </li>
            ))}
          </ul>
          {median !== null && (
            <p className="text-ink-2">
              {s.peers.length === 1 ? "Their rate" : `Median of ${s.peers.length} Independents`}: {money(median)} /month{medianPlace(median, s)}
            </p>
          )}
        </>
      )}
    </Source>
  );
}

/**
 * Under the Role field: templates matching what is being typed, so "assistant" offers Virtual
 * Assistant and Executive Assistant. The one already in use is left out.
 */
export function TemplateSuggestions({ query, applied, onPick }: { query: string; applied: RoleTemplate | null; onPick: (t: RoleTemplate) => void }) {
  if (query.trim().length < 2) return null;
  const hits = searchTemplates(query)
    .filter((t) => t.id !== applied?.id)
    .slice(0, 3);
  if (hits.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
      <span>Fill in from a template:</span>
      {hits.map((t) => (
        <button key={t.id} type="button" onClick={() => onPick(t)} className="rounded-full bg-accent-bg px-3 py-1 font-semibold text-accent-ink hover:brightness-95">
          {t.title}
        </button>
      ))}
    </span>
  );
}
