import Link from "next/link";
import { MessageButton } from "@/components/portal/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { Contract } from "@/lib/independent/data";
import { useQuickChat } from "@/lib/portal/quick-chat";
import { companyChat } from "../_lib/chat";

/**
 * All contracts › the contract, on every tab, as the Team Builder's tracker reads (All Independents ›
 * the person): the tabs under the title already say which one is open. With the tab as a third crumb,
 * a phone — which shows only the step back — offered the contract itself as the way back from its
 * own Overview.
 */
export function Crumbs({ contract }: { contract: Contract }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/independent/contracts" />}>All contracts</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {contract.title} at {contract.company}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** IN-037 — on every tab: the conversation. Filing a dispute is on the contract's dispute card, not up here. */
export function HeaderActions({ contract, thread }: { contract: Contract; thread: string }) {
  const chat = useQuickChat();
  return (
    /* The thread opens on the spot, in the quick chat, with the full one in Messages a click away. */
    <MessageButton size="md" href={thread} onClick={() => chat.open(companyChat(contract, thread))}>
      Message {contract.managerFirst}
    </MessageButton>
  );
}
