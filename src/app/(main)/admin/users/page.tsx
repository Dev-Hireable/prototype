import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { teamBuilders } from "@/lib/admin/data/users";
import type { TeamBuilder } from "@/lib/admin/data/users";

export default function TeamBuilderAccounts() {
  return (
    <AdminPage title="Team builder accounts">
      <Toolbar>
        <SearchInput placeholder="Search accounts" />
        <Select label="Status" options={["All statuses", "Active", "Suspended", "Payment failed"]} />
        <Select label="Plan" options={["All plans", "Starter", "Growth", "Scale"]} />
      </Toolbar>

      <DataTable<TeamBuilder>
        rows={teamBuilders}
        rowHref={(r) => `/admin/users/${r.slug}`}
        columns={[
          { header: "Company", cell: (r) => r.company },
          { header: "Contact", cell: (r) => r.contact, width: 210 },
          { header: "Plan", cell: (r) => r.plan, width: 130 },
          { header: "Contracts", cell: (r) => r.contracts, width: 110 },
          { header: "Joined", cell: (r) => r.joined, width: 120 },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, width: 130 },
        ]}
      />
    </AdminPage>
  );
}
