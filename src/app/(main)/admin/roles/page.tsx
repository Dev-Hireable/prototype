import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { roles } from "@/lib/admin/data/roles";
import type { Role } from "@/lib/admin/data/roles";

export default function AllRoles() {
  return (
    <AdminPage title="All roles">
      <Toolbar>
        <SearchInput placeholder="Search roles" />
        <Select label="Status" options={["All statuses", "Active", "Draft", "Flagged", "Closed"]} />
        <Select label="Type" options={["All types", "Trial", "Full-time", "Part-time"]} />
      </Toolbar>

      <DataTable<Role>
        rows={roles}
        rowHref={(r) => `/admin/roles/${r.slug}`}
        columns={[
          { header: "Role", cell: (r) => r.role, width: "26%" },
          { header: "Company", cell: (r) => r.company, width: "20%" },
          { header: "Type", cell: (r) => r.type, width: "12%" },
          { header: "Applicants", cell: (r) => r.applicants, width: "12%" },
          { header: "Posted", cell: (r) => r.posted, width: "14%" },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, width: "14%" },
        ]}
      />
    </AdminPage>
  );
}
