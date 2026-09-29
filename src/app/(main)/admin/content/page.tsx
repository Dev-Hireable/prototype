import { AdminPage, DataTable, SearchInput, Select, Toolbar } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import { Button } from "@/components/portal/ui";
import { banners } from "@/lib/admin/data/content";
import type { Banner } from "@/lib/admin/data/content";

export default function MarketingBanners() {
  return (
    <AdminPage title="Marketing banners">
      <Toolbar>
        <SearchInput placeholder="Search banners" />
        <Select label="Audience" options={["All audiences", "Team Builder", "Independent", "Both"]} />
        <Select label="Status" options={["All statuses", "Live", "Scheduled", "Ended", "Draft"]} />
        <Button size="sm" variant="primary">New banner</Button>
      </Toolbar>

      <DataTable<Banner>
        rows={banners}
        columns={[
          { header: "Banner", cell: (b) => b.banner },
          { header: "Audience", cell: (b) => b.audience, width: "16%" },
          { header: "Placement", cell: (b) => b.placement, width: "16%" },
          { header: "Runs until", cell: (b) => b.runsUntil, width: "14%" },
          { header: "Status", cell: (b) => <Badge tone={b.tone}>{b.status}</Badge>, width: "14%" },
        ]}
      />
    </AdminPage>
  );
}
