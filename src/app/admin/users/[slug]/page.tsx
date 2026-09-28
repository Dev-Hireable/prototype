import { notFound } from "next/navigation";
import { AccountDetail } from "@/components/admin/AccountDetail";
import { teamBuilders } from "@/lib/admin/data/users";

export function generateStaticParams() {
  return teamBuilders.map((t) => ({ slug: t.slug }));
}

export default async function TeamBuilderProfile({ params }: PageProps<"/admin/users/[slug]">) {
  const { slug } = await params;
  const account = teamBuilders.find((t) => t.slug === slug);
  if (!account) notFound();

  return (
    <AccountDetail
      title={account.company}
      backHref="/admin/users"
      backLabel="Back to team builder accounts"
      stats={account.stats}
      activity={account.activity}
      disputes={{ party: "team", slug: account.slug }}
    />
  );
}
