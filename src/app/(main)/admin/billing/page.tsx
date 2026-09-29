import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { transactions } from "@/lib/admin/data/billing";
import type { Transaction } from "@/lib/admin/data/billing";

export default function AllTransactions() {
  return (
    <AdminPage title="All transactions">
      <Toolbar>
        <SearchInput placeholder="Search transactions" />
        <Select
          label="Type"
          options={["All types", "Escrow deposit", "Escrow release", "Subscription", "Refund"]}
        />
        <Select label="Status" options={["All statuses", "Held", "Paid", "Paid out", "Failed", "Refunded"]} />
      </Toolbar>

      <DataTable<Transaction>
        rows={transactions}
        rowHref={(t) => `/admin/billing/${t.slug}`}
        columns={[
          { header: "Reference", cell: (t) => t.reference, width: "20%" },
          { header: "Company", cell: (t) => t.company, width: "22%" },
          { header: "Type", cell: (t) => t.type, width: "18%" },
          { header: "Amount", cell: (t) => t.amount, width: "12%" },
          { header: "Date", cell: (t) => t.date, width: "14%" },
          { header: "Status", cell: (t) => <Badge tone={t.tone}>{t.status}</Badge>, width: "14%" },
        ]}
      />
    </AdminPage>
  );
}
