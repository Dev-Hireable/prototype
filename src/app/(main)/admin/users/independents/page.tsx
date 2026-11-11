import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { independents } from "@/lib/admin/data/users";
import type { Independent } from "@/lib/admin/data/users";

export default function IndependentAccounts() {
  return (
    <Page title="Independent accounts">
      <Toolbar>
        <SearchBox placeholder="Search independents" className="w-[320px]" />
        <Select aria-label="Status" options={["All statuses", "On trial", "Full-time", "Awaiting review", "Suspended"]} className="!w-[180px]" />
        <Select aria-label="Verification" options={["All verification", "Verified", "Pending ID", "Rejected"]} className="!w-[180px]" />
      </Toolbar>

      <DataTable<Independent>
        rows={independents}
        rowHref={(r) => `/admin/users/independents/${r.slug}`}
        columns={[
          { header: "Name", cell: (r) => r.name },
          { header: "Role", cell: (r) => r.role, col: "w-[180px]" },
          { header: "Verification", cell: (r) => r.verification, col: "w-[140px]" },
          { header: "Contracts", cell: (r) => r.contracts, col: "w-[100px]" },
          { header: "Joined", cell: (r) => r.joined, col: "w-[140px]" },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, col: "w-[140px]" },
        ]}
      />
    </Page>
  );
}
