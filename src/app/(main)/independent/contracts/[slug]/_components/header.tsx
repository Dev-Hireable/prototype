import { MessageButton } from "@/components/kit/button";
import { BreadcrumbTrail } from "@/components/kit/breadcrumb";
import type { Contract } from "@/lib/independent/data";
import { useQuickChat } from "@/lib/portal/quick-chat";
import { companyChat } from "../_lib/chat";

/** All contracts › the contract, on every tab, as the Team Builder's tracker reads (All Independents › the person). */
export function Crumbs({ contract }: { contract: Contract }) {
  return (
    <BreadcrumbTrail href="/independent/contracts" parent="All contracts">
      {contract.title} at {contract.company}
    </BreadcrumbTrail>
  );
}

/** IN-037 — on every tab: the conversation. Filing a dispute is on the contract's dispute card, not up here. */
export function HeaderActions({ contract, thread }: { contract: Contract; thread: string }) {
  const chat = useQuickChat();
  return (
    /* The thread opens on the spot, in the quick chat, with the full one in Messages a click away. */
    <MessageButton size="sm" variant="secondary" className="max-md:size-10 max-md:px-0" href={thread} onClick={() => chat.open(companyChat(contract, thread))}>
      <span className="max-md:sr-only">Message {contract.managerFirst}</span>
    </MessageButton>
  );
}
