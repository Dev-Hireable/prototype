import { AdminPage, Button, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { auditLog } from "@/lib/admin/data/settings";
import type { AuditEntry } from "@/lib/admin/data/settings";

export default function AuditLogs() {
  return (
    <AdminPage title="Audit logs">
      <Toolbar>
        <SearchInput placeholder="Search events" />
        <Select label="Admin" options={["All admins", "R. Milano", "T. Arnaiz", "Rowena Alcantara"]} />
        <Select label="Action" options={["All actions", "Escrow", "Accounts", "Verification", "Roles"]} />
        <Button variant="primary">Export</Button>
      </Toolbar>

      <DataTable<AuditEntry>
        rows={auditLog}
        columns={[
          { header: "Action", cell: (e) => e.action },
          { header: "Admin", cell: (e) => e.admin, width: "16%" },
          { header: "Target", cell: (e) => e.target, width: "24%" },
          { header: "When", cell: (e) => e.when, width: "18%" },
        ]}
      />
    </AdminPage>
  );
}
