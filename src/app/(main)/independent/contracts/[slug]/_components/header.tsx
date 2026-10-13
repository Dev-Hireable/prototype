import Link from "next/link";
import { MessageButton } from "@/components/portal/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { CONTRACT_TABS } from "@/lib/contract/view";
import type { Contract } from "@/lib/independent/data";
import { useQuickChat } from "@/lib/portal/quick-chat";
import { companyChat } from "../_lib/chat";

type Section = (typeof CONTRACT_TABS)[number];

const SECTION_LABEL: Record<Exclude<Section, "tasks">, string> = { evaluation: "Evaluation", overview: "Overview", contract: "Contract & Payment" };

/** All contracts › the contract — and, on a tab other than Work, the tab, with the contract's crumb leading back to Work. */
export function Crumbs({ contract, tab }: { contract: Contract; tab: Section }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/independent/contracts" />}>All contracts</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {tab === "tasks" ? (
          <BreadcrumbItem>
            <BreadcrumbPage>
              {contract.title} — {contract.company}
            </BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            {/* On a tab, the contract crumb leads back to its default Tasks tab. */}
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/independent/contracts/${contract.slug}`} />}>
                {contract.title} — {contract.company}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{SECTION_LABEL[tab]}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
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
