"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Input, KebabMenu, Modal } from "@/components/portal/ui";
import { MenuAction } from "@/components/portal/controls";
import { TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { WorkProject } from "@/lib/work/model";
import { ALL, OPEN, scopeLabel, type ProjectSummary } from "@/lib/work/projects";
import type { WorkQuery } from "@/lib/work/query";
import { checkProjectName } from "@/lib/work/validate";
import { useWorkspace } from "./context";

/**
 * TB-148 — which of a role's work is showing: the open work (the default — work outside a project
 * and the active projects), all of it, or one place, each with its progress. None is built in: the
 * Team Builder adds projects here, and renames, finishes or reopens the one that's showing; a
 * finished one can be archived (kept under Archived) or deleted (its work leaves the project).
 * "No project" is listed only while there's work outside a project. On a trial there are no projects, so
 * there's no picker — and the repository refuses one.
 */
export function ProjectPicker({ setQuery }: { setQuery: (p: Partial<WorkQuery>) => void }) {
  const { projects } = useWorkspace();
  const { places, scope, canPlan } = projects;
  const [naming, setNaming] = useState<{ project?: WorkProject } | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const current = places.find((p) => p.key === scope);
  const pick = (v: string) => setQuery({ project: v });
  const project = current?.project;
  return (
    <div className="flex items-center gap-1">
      <PlaceMenu places={places} scope={scope} canPlan={canPlan} pick={pick} onNew={() => setNaming({})} />
      {canPlan && project && current && <ProjectActions place={current} project={project} onRename={() => setNaming({ project })} onDelete={() => setDeleting(current)} />}
      {deleting?.project && <DeleteProjectDialog place={deleting} project={deleting.project} onClose={() => setDeleting(null)} onDeleted={() => setQuery({ project: OPEN })} />}
      <ProjectNameDialog
        key={naming ? (naming.project?.id ?? "new") : "closed"}
        open={!!naming}
        project={naming?.project}
        onClose={() => setNaming(null)}
        onCreated={(id) => setQuery({ project: id })}
      />
    </div>
  );
}

/** The picker's menu: the open work and all of it, then the projects — active, finished, archived — and a new one. */
function PlaceMenu({ places, scope, canPlan, pick, onNew }: { places: readonly ProjectSummary[]; scope: string; canPlan: boolean; pick: (v: string) => void; onNew: () => void }) {
  const open = places.filter((p) => !p.finished && (p.kind !== "none" || p.total > 0));
  const finished = places.filter((p) => p.finished && !p.archived);
  const archived = places.filter((p) => p.archived);
  const openCount = open.reduce((n, p) => n + p.open, 0);
  const allCount = places.reduce((n, p) => n + p.total, 0);
  const label = scopeLabel(scope, places);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TOOLBAR_BUTTON} aria-label={`Showing ${label}. Change project`}>
        <ICONS.project size={17} aria-hidden />
        <span className="max-w-48 truncate">{label}</span>
        <ICONS.chevron size={16} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={scope} onValueChange={pick}>
            <DropdownMenuRadioItem value={OPEN} closeOnClick>
              <Row name="Open work" detail={`${openCount} open`} />
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={ALL} closeOnClick>
              <Row name="All work" detail={`${allCount} ${allCount === 1 ? "item" : "items"}, finished work too`} />
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <PlaceGroup label="Projects" places={open} scope={scope} pick={pick} />
        {finished.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <PlaceGroup label="Finished" places={finished} scope={scope} pick={pick} />
          </>
        )}
        {archived.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <PlaceGroup label="Archived" places={archived} scope={scope} pick={pick} />
          </>
        )}
        {canPlan && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNew}>
              <ICONS.add size={17} aria-hidden /> New project…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One labelled group of places in the menu, each a choice with its progress. */
function PlaceGroup({ label, places, scope, pick }: { label: string; places: readonly ProjectSummary[]; scope: string; pick: (v: string) => void }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={scope} onValueChange={pick}>
        {places.map((p) => (
          <DropdownMenuRadioItem key={p.key} value={p.key} closeOnClick>
            <Place p={p} />
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

/** The showing project's menu: rename, finish or reopen, archive or unarchive — and delete, once it's finished or empty. */
function ProjectActions({ place: current, project, onRename, onDelete }: { place: ProjectSummary; project: WorkProject; onRename: () => void; onDelete: () => void }) {
  const { actions } = useWorkspace();
  return (
    <KebabMenu label={`Actions for the project ${project.name}`} icon="horizontal" iconSize={20} menuWidth={240}>
      {current.archived ? (
        <MenuAction onClick={() => void actions.unarchiveProject(project)} icon={<ICONS.unarchive size={18} aria-hidden />}>
          Unarchive
        </MenuAction>
      ) : (
        <>
          <MenuAction onClick={onRename} icon={<ICONS.edit size={18} aria-hidden />}>
            Rename…
          </MenuAction>
          {current.finished ? (
            <>
              <MenuAction onClick={() => void actions.reopenProject(project)} icon={<ICONS.undo size={18} aria-hidden />}>
                Reopen
              </MenuAction>
              <MenuAction onClick={() => void actions.archiveProject(project)} icon={<ICONS.archive size={18} aria-hidden />}>
                Archive
              </MenuAction>
            </>
          ) : (
            // Said in the row, not a tooltip: what's left before it can finish.
            <MenuAction disabled={current.open > 0} onClick={() => void actions.finishProject(project)} icon={<ICONS.check size={18} aria-hidden />}>
              {current.open > 0 ? `Finish — ${current.open} still open` : "Mark finished"}
            </MenuAction>
          )}
        </>
      )}
      {/* A finished project, or an empty one — work still in an active project is finished or moved first. */}
      {(current.finished || current.total === 0) && (
        <MenuAction destructive onClick={onDelete} icon={<ICONS.trash size={18} aria-hidden />}>
          Delete…
        </MenuAction>
      )}
    </KebabMenu>
  );
}

/** Deleting a project, confirmed first; `onDeleted` runs once the repository has removed it. */
function DeleteProjectDialog({ place, project, onClose, onDeleted }: { place: ProjectSummary; project: WorkProject; onClose: () => void; onDeleted: () => void }) {
  const { actions } = useWorkspace();
  return (
    <Modal
      open
      tone="danger"
      onClose={onClose}
      title={`Delete “${place.name}”?`}
      description={deleteNote(place.total)}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              const n = place.total;
              onClose();
              void actions.deleteProject(project, n).then((ok) => ok && onDeleted());
            }}
          >
            Delete project
          </Button>
        </>
      }
    />
  );
}

/** What deleting a project does to the work in it — nothing is lost with it. */
function deleteNote(total: number) {
  return total
    ? `The project is removed for good. Its ${total === 1 ? "item stays" : `${total} items stay`} on the contract, outside a project, with ${total === 1 ? "its" : "their"} history — work is the contract's record, so it isn't deleted with the project.`
    : "The project is removed for good. There's nothing in it.";
}

function Row({ name, detail }: { name: string; detail: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate">{name}</span>
      <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{detail}</span>
    </span>
  );
}

/** A place in the list, with how far along it is: a project's "4 of 5", no project's open count. */
function Place({ p }: { p: ProjectSummary }) {
  const detail = p.kind === "none" ? `${p.open} open` : p.kind === "trial" ? `${p.done} done` : p.total === 0 ? "Empty" : `${p.done} of ${p.total}`;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className="min-w-0 flex-1 truncate">{p.name}</span>
      {p.kind === "project" && p.total > 0 && (
        <span aria-hidden className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-ok" style={{ width: `${(p.done / p.total) * 100}%` }} />
        </span>
      )}
      <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{detail}</span>
    </span>
  );
}

/** Name a new project, or rename one — checked as it's typed with the rule the save runs. */
function ProjectNameDialog({ open, project, onClose, onCreated }: { open: boolean; project?: WorkProject; onClose: () => void; onCreated: (id: string) => void }) {
  const { actions } = useWorkspace();
  const all = useWorkspace().projects.places.flatMap((p) => (p.project ? [p.project] : []));
  const [name, setName] = useState(project?.name ?? "");
  const [touched, setTouched] = useState(false);
  const problem = checkProjectName(name, all, project?.id)?.message ?? null;
  const unchanged = !!project && name.trim() === project.name;
  const save = async () => {
    setTouched(true);
    if (problem || unchanged) return;
    if (project) {
      onClose();
      void actions.renameProject(project, name);
      return;
    }
    onClose();
    const id = await actions.createProject(name);
    if (id) onCreated(id);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? `Rename “${project.name}”` : "New project"}
      description={project ? undefined : "A body of work with its own progress. When it's finished, it leaves the open work and its items are kept."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={unchanged || (touched && !!problem)} onClick={() => void save()}>
            {project ? "Rename" : "Add project"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-1.5"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Project name</span>
          <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand refresh, Q4 campaign" aria-invalid={touched && !!problem} />
        </label>
        {touched && problem && (
          <span role="alert" className="text-[12.5px] text-danger">
            {problem}
          </span>
        )}
      </form>
    </Modal>
  );
}
