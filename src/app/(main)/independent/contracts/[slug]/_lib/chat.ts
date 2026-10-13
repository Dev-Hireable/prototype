import type { Contract } from "@/lib/independent/data";
import type { QuickChatTarget } from "@/lib/portal/quick-chat";

/** The contract's company as the quick chat heads its thread. */
export const companyChat = (contract: Contract, thread: string): QuickChatTarget => ({ name: contract.company, sub: `${contract.manager} · Hiring manager`, initials: contract.initials, href: thread });
