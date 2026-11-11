import { DisputeHistory } from "./dispute-history";
import { LiveContractCard } from "./live-contract";
import { BreadcrumbBack } from "@/components/kit/breadcrumb";
import { ICONS } from "@/components/icons";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { Page } from "@/components/kit/page";
import { DataTable, StatCard, StatGrid } from "./ui";
import type { ActivityEvent, Stat } from "@/lib/admin/data/users";

/** Shared layout for the two account profile screens (stats row, activity log, dispute history). */
export function AccountDetail({
  title,
  backHref,
  backLabel,
  stats,
  activity,
  disputes,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  stats: Stat[];
  activity: ActivityEvent[];
  /** AD-011 / AD-022 — whose disputes to list: the account's side and its slug. */
  disputes: { party: "team" | "independent"; slug: string };
}) {
  return (
    <Page
      nav={<BreadcrumbBack href={backHref}>{backLabel}</BreadcrumbBack>}
      title={title}
      headerActions={
        <>
          <Button size="sm">
            <ICONS.messages size={16} aria-hidden />
            Message
          </Button>
          <Button size="sm" variant="danger">
            Suspend
          </Button>
        </>
      }
    >

      <div className="flex flex-col gap-4">
        <StatGrid>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        <LiveContractCard party={disputes.party} slug={disputes.slug} />

        <ActivityLog activity={activity} />

        <DisputeHistory party={disputes.party} slug={disputes.slug} />
      </div>
    </Page>
  );
}

/** The account's activity log: what happened, who did it and when — or a line saying nothing has yet. */
function ActivityLog({ activity }: { activity: ActivityEvent[] }) {
  return activity.length > 0 ? (
    <DataTable<ActivityEvent>
      caption="Activity"
      rows={activity}
      columns={[
        { header: "Event", cell: (r) => r.event },
        { header: "Actor", cell: (r) => r.actor, col: "w-[220px]" },
        { header: "When", cell: (r) => r.when, col: "w-[200px]" },
      ]}
    />
  ) : (
    <EmptyState title="No activity recorded yet" />
  );
}
