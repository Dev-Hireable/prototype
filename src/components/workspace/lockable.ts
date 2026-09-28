import { isArchived, isCompleted, type WorkItem } from "@/lib/work/model";
import { isAgreed, lockedReason, type AgreedField, type Role, type WorkAccess, type WorkField } from "@/lib/work/permissions";

/**
 * TB-077 — whether `field` shows as a lock where it would be edited: the signed offer set it and its
 * terms still hold (isAgreed), for someone working on the contract, on live work — the contract open,
 * the item not deleted, done or part of finished work. Both sides see it. What someone can't change
 * for who they are, rather than what was agreed, reads as plain text.
 */
export function lockable(item: WorkItem, field: WorkField, role: Role, access: WorkAccess): field is AgreedField {
  return isAgreed(item, access, field) && role !== "viewer" && access.open && !isArchived(item) && !isCompleted(item.status) && !lockedReason(item, access);
}

/** Each field a signed offer sets (AGREED_FIELDS), as it's named where someone tries to change it. */
const LABEL: Record<AgreedField, string> = { title: "name", description: "description", due: "due date", priority: "priority", assignee: "assignee" };

const capital = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

/** A locked value's accessible name: the field, and that the signed offer agreed it. */
export const lockLabel = (field: AgreedField) => `${capital(LABEL[field])}: agreed in the signed offer`;

/** What trying to change an agreed value says: it was settled before the offer went out, in the proposal both sides worked on. */
export const agreedReason = (field: AgreedField) => `${capital(LABEL[field])} was agreed in the signed offer, so it stays as agreed.`;
