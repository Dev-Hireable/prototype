import { Page } from "@/components/kit/page";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { revenueByPlan, revenueKpis } from "@/lib/admin/data/stats";
import type { PlanRevenue } from "@/lib/admin/data/stats";

export default function GrowthAndRevenue() {
  return (
    <Page title="Growth & revenue">
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
            { header: "Accounts", cell: (p) => p.accounts, col: "w-[140px]" },
            { header: "MRR", cell: (p) => p.mrr, col: "w-[140px]" },
            { header: "Share", cell: (p) => p.share, col: "w-[120px]" },
            { header: "Churn, 90 days", cell: (p) => p.churn, col: "w-[160px]" },
          ]}
        />
      </div>
    </Page>
  );
}
