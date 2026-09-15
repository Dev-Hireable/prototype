import { AdminPage, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { cohorts, platformKpis } from "@/lib/admin/data/stats";
import type { Cohort } from "@/lib/admin/data/stats";

export default function PlatformStats() {
  return (
    <AdminPage title="Platform stats">
      <div className="flex flex-col gap-4">
        <StatGrid>
          {platformKpis.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        <DataTable<Cohort>
          caption="Conversion by cohort"
          rows={cohorts}
          columns={[
            { header: "Cohort", cell: (c) => c.cohort },
            { header: "Sign-ups", cell: (c) => c.signups, width: "14%" },
            { header: "Trials", cell: (c) => c.trials, width: "14%" },
            { header: "Converted", cell: (c) => c.converted, width: "14%" },
            { header: "Rate", cell: (c) => c.rate, width: "12%" },
          ]}
        />
      </div>
    </AdminPage>
  );
}
