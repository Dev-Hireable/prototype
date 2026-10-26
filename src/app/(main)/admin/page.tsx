import { BarChart, Donut, Legend } from "@/components/admin/charts";
import { NeedsAttention } from "@/components/admin/needs-attention";
import { AdminPage, StatCard, StatGrid } from "@/components/admin/ui";
import { Card } from "@/components/portal/ui";
import { needsAttention, platformStats, signups, trialOutcomes } from "@/lib/admin/data/home";

export default function AdminDashboard() {
  return (
    <AdminPage title="Admin dashboard">
      <StatGrid>
        {platformStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </StatGrid>

      {/* Level cards: the donut's stretches to the bar chart's height, its ring centred in it. */}
      <div className="flex w-full items-stretch gap-4 max-md:flex-col">
        <Card title="Sign-ups — last 8 months" aside={<Legend series={signups.series} />} className="min-w-0 flex-1 p-[18px]">
          <BarChart {...signups} />
        </Card>
        <Card title="Trial outcomes — 41 completed" className="flex w-[380px] shrink-0 items-center p-[18px] max-md:w-full">
          <Donut {...trialOutcomes} />
        </Card>
      </div>

      <NeedsAttention items={needsAttention} />
    </AdminPage>
  );
}
