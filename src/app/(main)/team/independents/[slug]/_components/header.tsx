import Link from "next/link";
import { Button, LinkButton } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { ContractView } from "@/lib/contract/view";
import { caseHref } from "@/lib/demo/disputes";

/** All Independents › the person. */
export function Crumbs({ name }: { name: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/team/independents" />}>All Independents</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * The contract's one way into a dispute, on its Disputes card: file one, open the one already
 * running, or (disabled) say why not, in the words of fileBlock's rule.
 */
export function DisputeButton({ size, view, onFile }: { size: "md" | "lg"; view: ContractView; onFile: () => void }) {
  const { block, running, fileHint } = view;
  if (block === "open" && running) {
    return (
      <LinkButton size={size} href={caseHref("team", running.id)}>
        View dispute
      </LinkButton>
    );
  }
  return (
    <Tip label={fileHint} wrap>
      <Button size={size} disabled={!!block} onClick={onFile}>
        {block === "withdrawn" ? "Dispute withdrawn" : "File a dispute"}
      </Button>
    </Tip>
  );
}
