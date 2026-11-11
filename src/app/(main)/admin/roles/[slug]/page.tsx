import { notFound } from "next/navigation";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { Button } from "@/components/kit/button";
import { Page } from "@/components/kit/page";
import { BreadcrumbBack } from "@/components/kit/breadcrumb";
import { roles } from "@/lib/admin/data/roles";
import type { Check } from "@/lib/admin/data/roles";

export function generateStaticParams() {
  return roles.map((r) => ({ slug: r.slug }));
}

export default async function RoleDetail({ params }: PageProps<"/admin/roles/[slug]">) {
  const { slug } = await params;
  const role = roles.find((r) => r.slug === slug);
  if (!role) notFound();

  return (
    <Page
      nav={<BreadcrumbBack href="/admin/roles">Back to all roles</BreadcrumbBack>}
      title={role.role}
      headerActions={
        <>
          <Button size="sm">Unpublish</Button>
          <Button size="sm" variant="primary">Approve</Button>
        </>
      }
    >

      <div className="flex flex-col gap-4">
        <StatGrid>
          {role.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </StatGrid>

        <DataTable<Check>
          caption="Automated checks"
          rows={role.checks}
          columns={[
            { header: "Check", cell: (c) => c.check },
            {
              header: "Result",
              col: "w-[340px]",
              cell: (c) => <Badge tone={c.pass ? "ok" : "warn"}>{c.result}</Badge>,
            },
            { header: "Checked", cell: (c) => c.checked, col: "w-[160px]" },
          ]}
        />
      </div>
    </Page>
  );
}
