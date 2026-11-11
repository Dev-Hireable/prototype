import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { Button } from "@/components/kit/button";
import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { banners } from "@/lib/admin/data/content";
import type { Banner } from "@/lib/admin/data/content";

export default function MarketingBanners() {
  return (
    <Page title="Marketing banners">
      <Toolbar>
        <SearchBox placeholder="Search banners" className="w-[320px]" />
        <Select aria-label="Audience" options={["All audiences", "Team Builder", "Independent", "Both"]} className="!w-[180px]" />
        <Select aria-label="Status" options={["All statuses", "Live", "Scheduled", "Ended", "Draft"]} className="!w-[180px]" />
        <Button size="sm" variant="primary">New banner</Button>
      </Toolbar>

      <DataTable<Banner>
        rows={banners}
        columns={[
          { header: "Banner", cell: (b) => b.banner },
          { header: "Audience", cell: (b) => b.audience, col: "w-[160px]" },
          { header: "Placement", cell: (b) => b.placement, col: "w-[160px]" },
          { header: "Runs until", cell: (b) => b.runsUntil, col: "w-[140px]" },
          { header: "Status", cell: (b) => <Badge tone={b.tone}>{b.status}</Badge>, col: "w-[140px]" },
        ]}
      />
    </Page>
  );
}
