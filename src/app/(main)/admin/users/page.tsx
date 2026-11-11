import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { teamBuilders } from "@/lib/admin/data/users";
import type { TeamBuilder } from "@/lib/admin/data/users";

export default function TeamBuilderAccounts() {
  return (
    <Page title="Team builder accounts">
      <Toolbar>
        <SearchBox placeholder="Search accounts" className="w-[320px]" />
        <Select aria-label="Status" options={["All statuses", "Active", "Suspended", "Payment failed"]} className="!w-[180px]" />
        <Select aria-label="Plan" options={["All plans", "Starter", "Growth", "Scale"]} className="!w-[180px]" />
      </Toolbar>

      <DataTable<TeamBuilder>
        rows={teamBuilders}
        rowHref={(r) => `/admin/users/${r.slug}`}
        columns={[
          { header: "Company", cell: (r) => r.company },
          { header: "Contact", cell: (r) => r.contact, col: "w-[210px]" },
          { header: "Plan", cell: (r) => r.plan, col: "w-[130px]" },
          { header: "Contracts", cell: (r) => r.contracts, col: "w-[110px]" },
          { header: "Joined", cell: (r) => r.joined, col: "w-[120px]" },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, col: "w-[130px]" },
        ]}
      />
    </Page>
  );
}
