import { notFound } from "next/navigation";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { Page } from "@/components/kit/page";
import { BreadcrumbBack } from "@/components/kit/breadcrumb";
import { subscriptions } from "@/lib/admin/data/subscriptions";
import type { PlanChange } from "@/lib/admin/data/subscriptions";

export function generateStaticParams() {
  return subscriptions.map((s) => ({ slug: s.slug }));
}

export default async function SubscriptionDetail({ params }: PageProps<"/admin/subscriptions/[slug]">) {
  const { slug } = await params;
  const sub = subscriptions.find((s) => s.slug === slug);
  if (!sub) notFound();

  return (
    <Page
      nav={<BreadcrumbBack href="/admin/subscriptions">Back to all subscriptions</BreadcrumbBack>}
      title={sub.company}
      headerActions={
        <>
          <Button size="sm">Change plan</Button>
          <Button size="sm" variant="danger">Cancel</Button>
        </>
      }
    >

      <div className="flex flex-col gap-4">
        <StatGrid>
          {sub.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        {sub.history.length > 0 ? (
          <DataTable<PlanChange>
            caption="Plan history"
            rows={sub.history}
            columns={[
              { header: "Change", cell: (h) => h.change },
              { header: "By", cell: (h) => h.by, col: "w-[240px]" },
              { header: "Effective", cell: (h) => h.effective, col: "w-[180px]" },
            ]}
          />
        ) : (
          <EmptyState title="No plan changes recorded" />
        )}
      </div>
    </Page>
  );
}
