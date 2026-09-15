import { AdminPage, Badge, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { disputes } from "@/lib/admin/data/disputes";
import type { Dispute } from "@/lib/admin/data/disputes";

export default function AllDisputes() {
  return (
    <AdminPage title="All disputes">
      <Toolbar>
        <SearchInput placeholder="Search disputes" />
        <Select
          label="Status"
          options={["All statuses", "Pending review", "In review", "Awaiting evidence", "Resolved", "Closed"]}
        />
        <Select label="Reason" options={["All reasons", "Escrow", "Delivery", "Evidence", "Payment"]} />
      </Toolbar>

      <DataTable<Dispute>
        rows={disputes}
        rowHref={(d) => `/admin/disputes/${d.slug}`}
        columns={[
          { header: "Dispute", cell: (d) => d.dispute, width: "28%" },
          { header: "Contract", cell: (d) => d.contract, width: "20%" },
          { header: "Raised by", cell: (d) => d.raisedBy, width: "16%" },
          { header: "Amount", cell: (d) => d.amount, width: "10%" },
          { header: "Age", cell: (d) => d.age, width: "10%" },
          { header: "Status", cell: (d) => <Badge tone={d.tone}>{d.status}</Badge>, width: "16%" },
        ]}
      />
    </AdminPage>
  );
}
