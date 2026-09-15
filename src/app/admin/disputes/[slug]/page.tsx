import { notFound } from "next/navigation";
import { AdminPage, BackLink, Button, Card, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { disputes } from "@/lib/admin/data/disputes";
import type { ProcessCheck } from "@/lib/admin/data/disputes";
import type { ActivityEvent } from "@/lib/admin/data/users";

export function generateStaticParams() {
  return disputes.map((d) => ({ slug: d.slug }));
}

export default async function DisputeDetail({ params }: PageProps<"/admin/disputes/[slug]">) {
  const { slug } = await params;
  const dispute = disputes.find((d) => d.slug === slug);
  if (!dispute) notFound();

  return (
    <AdminPage
      title={dispute.dispute}
      actions={
        <>
          <Button>Request evidence</Button>
          <Button variant="primary">Resolve</Button>
        </>
      }
    >
      <BackLink href="/admin/disputes">Back to all disputes</BackLink>

      <div className="flex flex-col gap-4">
        <StatGrid>
          {dispute.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        {dispute.checks.length > 0 ? (
          <DataTable<ProcessCheck>
            caption="Process check — Hireable reviews compliance, not work quality"
            rows={dispute.checks}
            columns={[
              { header: "Check", cell: (c) => c.check },
              { header: "Result", cell: (c) => c.result, width: "30%" },
              { header: "Source", cell: (c) => c.source, width: "18%" },
            ]}
          />
        ) : (
          <Card className="px-5 py-10 text-center text-sm text-muted">
            Process check has not been run for this dispute.
          </Card>
        )}

        {dispute.timeline.length > 0 && (
          <DataTable<ActivityEvent>
            caption="Timeline"
            rows={dispute.timeline}
            columns={[
              { header: "Event", cell: (e) => e.event },
              { header: "Actor", cell: (e) => e.actor, width: "22%" },
              { header: "When", cell: (e) => e.when, width: "20%" },
            ]}
          />
        )}
      </div>
    </AdminPage>
  );
}
