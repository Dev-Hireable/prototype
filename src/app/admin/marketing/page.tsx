import { AdminPage, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { revenueByPlan, revenueKpis } from "@/lib/admin/data/stats";
import type { PlanRevenue } from "@/lib/admin/data/stats";

export default function GrowthAndRevenue() {
  return (
    <AdminPage title="Growth & revenue">
      <div className="flex flex-col gap-4">
        <StatGrid>
          {revenueKpis.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        <DataTable<PlanRevenue>
          caption="Revenue by plan"
          rows={revenueByPlan}
          columns={[
            { header: "Plan", cell: (p) => p.plan },
            { header: "Accounts", cell: (p) => p.accounts, width: "14%" },
            { header: "MRR", cell: (p) => p.mrr, width: "14%" },
            { header: "Share", cell: (p) => p.share, width: "12%" },
            { header: "Churn, 90 days", cell: (p) => p.churn, width: "16%" },
          ]}
        />
      </div>
    </AdminPage>
  );
}
