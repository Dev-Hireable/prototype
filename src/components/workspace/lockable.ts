import { isArchived, type WorkItem } from "@/lib/work/model";
import { lockedReason, type Role, type WorkAccess } from "@/lib/work/permissions";
import type { LockedPart } from "./contract-lock";

/**
 * A contract task whose scope could still change by amendment, for someone on the contract: its
 * contract takes changes, it isn't finished work, and it's to do or in progress — done work and work
 * in review keep what was agreed.
 */
export function amendable(item: WorkItem, role: Role, access: WorkAccess): boolean {
  return !!item.agreed && role !== "viewer" && access.open && !isArchived(item) && !lockedReason(item, access) && (item.status === "todo" || item.status === "doing");
}

/**
 * Whether a contract task's agreed field reads as locked where it would be edited — trying to change
 * it says why, and offers an amendment (ContractNotice). Anywhere else the value is plain text.
 */
export function lockable(item: WorkItem, role: Role, access: WorkAccess, onLocked?: (part: LockedPart) => void): onLocked is (part: LockedPart) => void {
  return !!onLocked && amendable(item, role, access);
}
