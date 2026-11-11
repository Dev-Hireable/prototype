import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { transactions } from "@/lib/admin/data/billing";
import type { Transaction } from "@/lib/admin/data/billing";

export default function AllTransactions() {
  return (
    <Page title="All transactions">
      <Toolbar>
        <SearchBox placeholder="Search transactions" className="w-[320px]" />
        <Select aria-label="Type" options={["All types", "Escrow deposit", "Escrow release", "Subscription", "Refund"]} className="!w-[180px]" />
        <Select aria-label="Status" options={["All statuses", "Held", "Paid", "Paid out", "Failed", "Refunded"]} className="!w-[180px]" />
      </Toolbar>

      <DataTable<Transaction>
        rows={transactions}
        rowHref={(t) => `/admin/billing/${t.slug}`}
        columns={[
          { header: "Reference", cell: (t) => t.reference },
          { header: "Company", cell: (t) => t.company, col: "w-[220px]" },
          { header: "Type", cell: (t) => t.type, col: "w-[180px]" },
          { header: "Amount", cell: (t) => t.amount, col: "w-[120px]" },
          { header: "Date", cell: (t) => t.date, col: "w-[140px]" },
          { header: "Status", cell: (t) => <Badge tone={t.tone}>{t.status}</Badge>, col: "w-[140px]" },
        ]}
      />
    </Page>
  );
}
