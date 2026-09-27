import { isArchived, type WorkItem } from "@/lib/work/model";
import { lockedReason, type Role, type WorkAccess } from "@/lib/work/permissions";
import type { LockedPart } from "./contract-lock";

/**
 * Whether a task from the signed offer shows its agreed fields as locked where they'd be edited, for
 * someone working on the contract: trying to change one says why (AgreedNotice). Work that's done, in
 * review or read-only anyway reads as plain text.
 */
export function lockable(item: WorkItem, role: Role, access: WorkAccess, onLocked?: (part: LockedPart) => void): onLocked is (part: LockedPart) => void {
  if (!onLocked || !item.agreed || role === "viewer" || !access.open || isArchived(item) || lockedReason(item, access)) return false;
  return item.status === "todo" || item.status === "doing";
}
