import { notFound } from "next/navigation";
import { AdminPage, BackLink, Button, Card, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
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
    <AdminPage
      title={sub.company}
      actions={
        <>
          <Button>Change plan</Button>
          <Button variant="danger">Cancel</Button>
        </>
      }
    >
      <BackLink href="/admin/subscriptions">Back to all subscriptions</BackLink>

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
              { header: "By", cell: (h) => h.by, width: "24%" },
              { header: "Effective", cell: (h) => h.effective, width: "18%" },
            ]}
          />
        ) : (
          <Card className="px-5 py-10 text-center text-sm text-muted">No plan changes recorded.</Card>
        )}
      </div>
    </AdminPage>
  );
}
