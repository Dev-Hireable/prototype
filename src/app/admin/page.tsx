import { BarChart, Donut, Legend } from "@/components/admin/charts";
import { NeedsAttention } from "@/components/admin/NeedsAttention";
import { AdminPage, StatCard, StatGrid } from "@/components/admin/ui";
import { Card } from "@/components/independent/ui";
import { needsAttention, platformStats, signups, trialOutcomes } from "@/lib/admin/data/home";

export default function AdminDashboard() {
  return (
    <AdminPage title="Admin dashboard">
      <StatGrid>
        {platformStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </StatGrid>

      <div className="flex w-full items-start gap-4 overflow-clip">
        <Card className="flex min-w-0 flex-1 flex-col gap-[14px] overflow-clip p-[18px]">
          <div className="flex w-full items-center gap-4 overflow-clip">
            <h2 className="text-[14px] leading-[1.45] font-semibold whitespace-nowrap text-ink-deep">
              Sign-ups — last 8 months
            </h2>
            <Legend series={signups.series} />
          </div>
          <BarChart {...signups} />
        </Card>

        <Card className="flex h-[276px] w-[380px] shrink-0 flex-col gap-[25px] overflow-clip p-[18px]">
          <h2 className="text-[14px] leading-[1.45] font-semibold whitespace-nowrap text-ink-deep">
            Trial outcomes — 41 completed
          </h2>
          <Donut {...trialOutcomes} />
        </Card>
      </div>

      <NeedsAttention items={needsAttention} />
    </AdminPage>
  );
}
