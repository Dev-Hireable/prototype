import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { roles } from "@/lib/admin/data/roles";
import type { Role } from "@/lib/admin/data/roles";

export default function AllRoles() {
  return (
    <Page title="All roles">
      <Toolbar>
        <SearchBox placeholder="Search roles" className="w-[320px]" />
        <Select aria-label="Status" options={["All statuses", "Active", "Draft", "Flagged", "Closed"]} className="!w-[180px]" />
        <Select aria-label="Type" options={["All types", "Trial", "Full-time", "Part-time"]} className="!w-[180px]" />
      </Toolbar>

      <DataTable<Role>
        rows={roles}
        rowHref={(r) => `/admin/roles/${r.slug}`}
        columns={[
          { header: "Role", cell: (r) => r.role },
          { header: "Company", cell: (r) => r.company, col: "w-[200px]" },
          { header: "Type", cell: (r) => r.type, col: "w-[120px]" },
          { header: "Applicants", cell: (r) => r.applicants, col: "w-[120px]" },
          { header: "Posted", cell: (r) => r.posted, col: "w-[140px]" },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, col: "w-[140px]" },
        ]}
      />
    </Page>
  );
}
