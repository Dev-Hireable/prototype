import { notFound } from "next/navigation";
import {
  AdminPage,
  Badge,
  BackLink,
  Button,
  DataTable,
  StatCard,
  StatGrid,
} from "@/components/admin/ui";
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
    <AdminPage
      title={role.role}
      actions={
        <>
          <Button>Unpublish</Button>
          <Button variant="primary">Approve</Button>
        </>
      }
    >
      <BackLink href="/admin/roles">Back to all roles</BackLink>

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
              width: "34%",
              cell: (c) => <Badge tone={c.pass ? "ok" : "warn"}>{c.result}</Badge>,
            },
            { header: "Checked", cell: (c) => c.checked, width: "16%" },
          ]}
        />
      </div>
    </AdminPage>
  );
}
