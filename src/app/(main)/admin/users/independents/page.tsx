import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { independents } from "@/lib/admin/data/users";
import type { Independent } from "@/lib/admin/data/users";

export default function IndependentAccounts() {
  return (
    <AdminPage title="Independent accounts">
      <Toolbar>
        <SearchInput placeholder="Search independents" />
        <Select label="Status" options={["All statuses", "On trial", "Full-time", "Awaiting review", "Suspended"]} />
        <Select label="Verification" options={["All verification", "Verified", "Pending ID", "Rejected"]} />
      </Toolbar>

      <DataTable<Independent>
        rows={independents}
        rowHref={(r) => `/admin/users/independents/${r.slug}`}
        columns={[
          { header: "Name", cell: (r) => r.name, width: "24%" },
          { header: "Role", cell: (r) => r.role, width: "18%" },
          { header: "Verification", cell: (r) => r.verification, width: "14%" },
          { header: "Contracts", cell: (r) => r.contracts, width: "10%" },
          { header: "Joined", cell: (r) => r.joined, width: "14%" },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, width: "14%" },
        ]}
      />
    </AdminPage>
  );
}
