import Link from "next/link";
import { Button, LinkButton } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { ContractView } from "@/lib/contract/view";
import { caseHref } from "@/lib/demo/disputes";

/** All independents › the person. */
export function Crumbs({ name }: { name: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/team/independents" />}>All independents</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** One button everywhere it appears: file one, open the one already running, or say why not. */
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
        {block === "withdrawn" ? "Dispute withdrawn" : "File a Dispute"}
      </Button>
    </Tip>
  );
}
