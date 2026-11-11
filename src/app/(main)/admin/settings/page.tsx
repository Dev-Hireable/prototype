import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { Button } from "@/components/kit/button";
import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { adminAccounts } from "@/lib/admin/data/settings";
import type { AdminAccount } from "@/lib/admin/data/settings";

export default function AdminAccounts() {
  return (
    <Page title="Admin accounts">
      <Toolbar>
        <SearchBox placeholder="Search admins" className="w-[320px]" />
        <Select aria-label="Role" options={["All roles", "Owner", "Operations", "Product", "Support"]} className="!w-[180px]" />
        <Button size="sm" variant="primary">Invite admin</Button>
      </Toolbar>

      <DataTable<AdminAccount>
        rows={adminAccounts}
        columns={[
          { header: "Name", cell: (a) => a.name },
          { header: "Email", cell: (a) => a.email, col: "w-[240px]" },
          { header: "Role", cell: (a) => a.role, col: "w-[140px]" },
          { header: "Last active", cell: (a) => a.lastActive, col: "w-[140px]" },
          { header: "Status", cell: (a) => <Badge tone={a.tone}>{a.status}</Badge>, col: "w-[140px]" },
        ]}
      />
    </Page>
  );
}
