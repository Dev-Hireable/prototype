import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { subscriptions } from "@/lib/admin/data/subscriptions";
import type { Subscription } from "@/lib/admin/data/subscriptions";

export default function AllSubscriptions() {
  return (
    <Page title="All subscriptions">
      <Toolbar>
        <SearchBox placeholder="Search subscriptions" className="w-[320px]" />
        <Select aria-label="Plan" options={["All plans", "Starter", "Growth", "Scale"]} className="!w-[180px]" />
        <Select aria-label="Status" options={["All statuses", "Active", "Payment failed", "Cancelled"]} className="!w-[180px]" />
      </Toolbar>

      <DataTable<Subscription>
        rows={subscriptions}
        rowHref={(s) => `/admin/subscriptions/${s.slug}`}
        columns={[
          { header: "Company", cell: (s) => s.company },
          { header: "Plan", cell: (s) => s.plan, col: "w-[120px]" },
          { header: "Seats", cell: (s) => s.seats, col: "w-[100px]" },
          { header: "MRR", cell: (s) => s.mrr, col: "w-[120px]" },
          { header: "Renews", cell: (s) => s.renews, col: "w-[160px]" },
          { header: "Status", cell: (s) => <Badge tone={s.tone}>{s.status}</Badge>, col: "w-[160px]" },
        ]}
      />
    </Page>
  );
}
