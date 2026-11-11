import { DataTable } from "@/components/admin/ui";
import { Button } from "@/components/kit/button";
import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { auditLog } from "@/lib/admin/data/settings";
import type { AuditEntry } from "@/lib/admin/data/settings";

export default function AuditLogs() {
  return (
    <Page title="Audit logs">
      <Toolbar>
        <SearchBox placeholder="Search events" className="w-[320px]" />
        <Select aria-label="Admin" options={["All admins", "Admin Lead", "Product Lead", "Ops Manager"]} className="!w-[180px]" />
        <Select aria-label="Action" options={["All actions", "Escrow", "Accounts", "Verification", "Roles"]} className="!w-[180px]" />
        <Button size="sm" variant="primary">Export</Button>
      </Toolbar>

      <DataTable<AuditEntry>
        rows={auditLog}
        columns={[
          { header: "Action", cell: (e) => e.action },
          { header: "Admin", cell: (e) => e.admin, col: "w-[160px]" },
          { header: "Target", cell: (e) => e.target, col: "w-[240px]" },
          { header: "When", cell: (e) => e.when, col: "w-[180px]" },
        ]}
      />
    </Page>
  );
}
