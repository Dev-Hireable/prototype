import Link from "next/link";
import { Button, LinkButton, MessageButton } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { CONTRACT_TABS, ContractView } from "@/lib/contract/view";
import { caseHref } from "@/lib/demo/disputes";
import type { Contract } from "@/lib/independent/data";

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

/** IN-037 / IN-032 — on every tab: the conversation, and the one dispute a contract can have. */
export function HeaderActions({ contract, thread, view, onFile }: { contract: Contract; thread: string; view: ContractView; onFile: () => void }) {
  const { block, running, fileHint } = view;
  return (
    <>
      <MessageButton size="md" href={thread}>
        Message {contract.managerFirst}
      </MessageButton>
      {/* Hidden once they have filed on this contract (one per contract). While any dispute is
          open on it, from either side, it opens that one instead. */}
      {block === "open" && running ? (
        <LinkButton size="md" href={caseHref("independent", running.id)}>
          View dispute
        </LinkButton>
      ) : (
        block !== "filed" && (
          <Tip label={fileHint} wrap>
            <Button size="md" disabled={!!block} onClick={onFile}>
              File a dispute
            </Button>
          </Tip>
        )
      )}
    </>
  );
}
