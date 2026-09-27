"use client";

import { useMemo } from "react";
import { today } from "@/lib/demo/dates";
import { closePosting, publishPosting, usePostings } from "@/lib/demo/deal";
import { persisted, useStored } from "@/lib/demo/live";
import { canPublishNow, companyStore, useCanPublish } from "./account";
import { roles as seedRoles } from "./data";
import type { Role, RoleStatus } from "./data";
import { postingFrom } from "./deal-view";

/* The Team Builder's roles: drafts, and the ones published to the talent's job board. */

const rolesStore = persisted("team.roles", seedRoles);

/** A role as a notification names it — the slug, if the role has gone. */
export const roleOf = (slug: string) => ({ slug, title: rolesStore.get().find((r) => r.slug === slug)?.title ?? slug });

/**
 * TB-024 / TB-025 — what each part of a role post needs before it can go live: the role's details
 * (a title, a description, a skill and an experience level), a trial's tasks, and a budget. The
 * create-role wizard's Next buttons and a draft's Publish hold to the same bar.
 */
export const roleParts = (r: Role) => ({
  details: r.title.trim().length > 1 && r.description.trim().length > 0 && r.skills.length > 0 && r.experience !== "Any level",
  expectations: (r.tasks?.length ?? 0) > 0,
  budget: /[1-9]/.test(r.budget),
});

/** Whether a saved draft has enough to publish — the same bar the Next buttons enforce. */
export function draftReady(r: Role) {
  const done = roleParts(r);
  return done.details && done.budget && (r.type !== "trial" || done.expectations);
}

function addRole(r: Role) {
  // TB-026 — an Active role is a posting the talent can find and apply to; a draft is not.
  // The checklist's lock holds here too: without a company profile and a card it saves as a draft.
  const role = r.status === "Active" && !canPublishNow() ? { ...r, status: "Draft" as const } : r;
  rolesStore.set((rs) => [role, ...rs.filter((x) => x.slug !== role.slug)]);
  if (role.status === "Active") publishPosting(postingFrom(role, companyStore.get()));
  else closePosting(role.slug);
}

/** TB-032 — copy any role into a fresh Draft and return the new slug. */
function duplicateRole(slug: string): string | undefined {
  const roles = rolesStore.get();
  const source = roles.find((r) => r.slug === slug);
  if (!source) return undefined;
  // Unique slug so the copy sits alongside the original rather than replacing it.
  let copy = `${slug}-copy`;
  for (let n = 2; roles.some((r) => r.slug === copy); n++) copy = `${slug}-copy-${n}`;
  // A duplicate starts as an empty Draft: the pipeline belongs to the role it was cloned from.
  // duplicatedFrom lets the wizard open this draft straight on Review (TB-035) — every field
  // is already filled, so there is nothing to walk back through.
  rolesStore.set((rs) => [{ ...source, slug: copy, title: `${source.title} (copy)`, status: "Draft", updated: today(), duplicatedFrom: slug, candidates: null, matched: null, interviews: null, offers: null, hired: null }, ...rs]);
  return copy;
}

function setRoleStatus(slug: string, status: RoleStatus) {
  if (status === "Active" && !canPublishNow()) return;
  const role = rolesStore.get().find((r) => r.slug === slug);
  rolesStore.set((rs) => rs.map((r) => (r.slug === slug ? { ...r, status, updated: today() } : r)));
  if (role && status === "Active") publishPosting(postingFrom({ ...role, status }, companyStore.get()));
  else closePosting(slug);
}

function removeRole(slug: string) {
  rolesStore.set((rs) => rs.filter((r) => r.slug !== slug));
  closePosting(slug);
}

export function useRoles() {
  const stored = useStored(rolesStore);
  const postings = usePostings();
  const canPublish = useCanPublish();
  /**
   * A role whose last seat was hired reads as Closed — its posting has left the board. Reopening
   * republishes the posting without the filled mark, so the role reads Active again.
   */
  const roles = useMemo(() => stored.map((r) => (r.status === "Active" && postings.some((p) => p.slug === r.slug && p.filled) ? { ...r, status: "Closed" as const } : r)), [stored, postings]);
  return { roles, canPublish, addRole, duplicateRole, setRoleStatus, removeRole };
}
