import { BarChart, Donut, Legend } from "@/components/admin/charts";
import { AdminPage, Badge, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { needsAttention, platformStats, signups, trialOutcomes } from "@/lib/admin/data/home";
import type { AttentionItem } from "@/lib/admin/data/home";

export default function AdminDashboard() {
  return (
    <AdminPage title="Admin dashboard">
      <StatGrid>
        {platformStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </StatGrid>

      {/* Figma "charts": gap 16; sign-ups card flex 1 (p 18, gap 14); trial outcomes 380×276 (p 18, gap 25) */}
      <div className="flex w-full items-start gap-4 overflow-clip">
        <section className="flex min-w-0 flex-1 flex-col gap-[14px] overflow-clip rounded-lg bg-white p-[18px] outline -outline-offset-1 outline-line">
          <div className="flex w-full items-center gap-4 overflow-clip">
            <h2 className="text-[14px] leading-[1.45] font-semibold whitespace-nowrap text-ink-deep">
              Sign-ups — last 8 months
            </h2>
            <Legend series={signups.series} />
          </div>
          <BarChart {...signups} />
        </section>

        <section className="flex h-[276px] w-[380px] shrink-0 flex-col gap-[25px] overflow-clip rounded-lg bg-white p-[18px] outline -outline-offset-1 outline-line">
          <h2 className="text-[14px] leading-[1.45] font-semibold whitespace-nowrap text-ink-deep">
            Trial outcomes — 41 completed
          </h2>
          <Donut {...trialOutcomes} />
        </section>
      </div>

      <DataTable<AttentionItem>
        caption="Needs attention"
        rows={needsAttention}
        rowHref={(r) => r.href}
        columns={[
          { header: "Item", cell: (r) => r.item },
          { header: "Type", cell: (r) => r.type, width: 150 },
          { header: "Raised by", cell: (r) => r.raisedBy, width: 200 },
          { header: "Age", cell: (r) => r.age, width: 110 },
          { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, width: 140 },
        ]}
      />
    </AdminPage>
  );
}
