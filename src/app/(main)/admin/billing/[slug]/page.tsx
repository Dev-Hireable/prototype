import { notFound } from "next/navigation";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { Button } from "@/components/kit/button";
import { Page } from "@/components/kit/page";
import { TextLink } from "@/components/kit/text-link";
import { BreadcrumbBack } from "@/components/kit/breadcrumb";
import { transactions } from "@/lib/admin/data/billing";
import type { BreakdownLine, LinkedRecord } from "@/lib/admin/data/billing";

export function generateStaticParams() {
  return transactions.map((t) => ({ slug: t.slug }));
}

export default async function TransactionDetail({ params }: PageProps<"/admin/billing/[slug]">) {
  const { slug } = await params;
  const txn = transactions.find((t) => t.slug === slug);
  if (!txn) notFound();

  return (
    <Page
      nav={<BreadcrumbBack href="/admin/billing">Back to all transactions</BreadcrumbBack>}
      title={txn.reference}
      headerActions={
        <>
          <Button size="sm">Download receipt</Button>
          <Button size="sm" variant="primary">Release escrow</Button>
        </>
      }
    >

      <div className="flex flex-col gap-4">
        <StatGrid>
          {txn.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        <DataTable<BreakdownLine>
          caption="Breakdown"
          rows={txn.breakdown}
          columns={[
            { header: "Line", cell: (b) => (b.total ? <strong>{b.line}</strong> : b.line) },
            { header: "Amount", align: "right", col: "w-[240px]", cell: (b) => (b.total ? <strong>{b.amount}</strong> : b.amount) },
          ]}
        />

        <DataTable<LinkedRecord>
          caption="Linked records"
          rows={txn.linked}
          columns={[
            { header: "Record", cell: (l) => l.record, col: "w-[260px]" },
            {
              header: "Reference",
              cell: (l) =>
                l.href ? (
                  <TextLink href={l.href}>
                    {l.reference}
                  </TextLink>
                ) : (
                  l.reference
                ),
            },
          ]}
        />
      </div>
    </Page>
  );
}
