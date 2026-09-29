import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { subscriptions } from "@/lib/admin/data/subscriptions";
import type { Subscription } from "@/lib/admin/data/subscriptions";

export default function AllSubscriptions() {
  return (
    <AdminPage title="All subscriptions">
      <Toolbar>
        <SearchInput placeholder="Search subscriptions" />
        <Select label="Plan" options={["All plans", "Starter", "Growth", "Scale"]} />
        <Select label="Status" options={["All statuses", "Active", "Payment failed", "Cancelled"]} />
      </Toolbar>

      <DataTable<Subscription>
        rows={subscriptions}
        rowHref={(s) => `/admin/subscriptions/${s.slug}`}
        columns={[
          { header: "Company", cell: (s) => s.company, width: "26%" },
          { header: "Plan", cell: (s) => s.plan, width: "12%" },
          { header: "Seats", cell: (s) => s.seats, width: "10%" },
          { header: "MRR", cell: (s) => s.mrr, width: "12%" },
          { header: "Renews", cell: (s) => s.renews, width: "16%" },
          { header: "Status", cell: (s) => <Badge tone={s.tone}>{s.status}</Badge>, width: "16%" },
        ]}
      />
    </AdminPage>
  );
}
