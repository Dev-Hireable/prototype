import { AdminPage, BackLink, Button, Card, DataTable, StatCard, StatGrid } from "./ui";
import type { ActivityEvent, Stat } from "@/lib/admin/data/users";

/** Shared layout for the two account profile screens (stats row + activity log). */
export function AccountDetail({
  title,
  backHref,
  backLabel,
  stats,
  activity,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  stats: Stat[];
  activity: ActivityEvent[];
}) {
  return (
    <AdminPage
      title={title}
      actions={
        <>
          <Button>Message</Button>
          <Button variant="danger">Suspend</Button>
        </>
      }
    >
      <BackLink href={backHref}>{backLabel}</BackLink>

      <div className="flex flex-col gap-4">
        <StatGrid>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        {activity.length > 0 ? (
          <DataTable<ActivityEvent>
            caption="Activity"
            rows={activity}
            columns={[
              { header: "Event", cell: (r) => r.event },
              { header: "Actor", cell: (r) => r.actor, width: "22%" },
              { header: "When", cell: (r) => r.when, width: "20%" },
            ]}
          />
        ) : (
          <Card className="px-5 py-10 text-center text-sm text-muted">No activity recorded yet.</Card>
        )}
      </div>
    </AdminPage>
  );
}
