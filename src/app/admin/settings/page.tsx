import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/Badge";
import { Button } from "@/components/independent/ui";
import { adminAccounts } from "@/lib/admin/data/settings";
import type { AdminAccount } from "@/lib/admin/data/settings";

export default function AdminAccounts() {
  return (
    <AdminPage title="Admin accounts">
      <Toolbar>
        <SearchInput placeholder="Search admins" />
        <Select label="Role" options={["All roles", "Owner", "Operations", "Product", "Support"]} />
        <Button size="sm" variant="primary">Invite admin</Button>
      </Toolbar>

      <DataTable<AdminAccount>
        rows={adminAccounts}
        columns={[
          { header: "Name", cell: (a) => a.name },
          { header: "Email", cell: (a) => a.email, width: "24%" },
          { header: "Role", cell: (a) => a.role, width: "14%" },
          { header: "Last active", cell: (a) => a.lastActive, width: "14%" },
          { header: "Status", cell: (a) => <Badge tone={a.tone}>{a.status}</Badge>, width: "14%" },
        ]}
      />
    </AdminPage>
  );
}
