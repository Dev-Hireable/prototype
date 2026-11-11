import { Page } from "@/components/kit/page";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { cohorts, platformKpis } from "@/lib/admin/data/stats";
import type { Cohort } from "@/lib/admin/data/stats";

export default function PlatformStats() {
  return (
    <Page title="Platform stats">
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
            { header: "Sign-ups", cell: (c) => c.signups, col: "w-[140px]" },
            { header: "Trials", cell: (c) => c.trials, col: "w-[140px]" },
            { header: "Converted", cell: (c) => c.converted, col: "w-[140px]" },
            { header: "Rate", cell: (c) => c.rate, col: "w-[120px]" },
          ]}
        />
      </div>
    </Page>
  );
}
