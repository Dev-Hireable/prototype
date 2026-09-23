import { notFound } from "next/navigation";
import { AccountDetail } from "@/components/admin/AccountDetail";
import { independents } from "@/lib/admin/data/users";

export function generateStaticParams() {
  return independents.map((i) => ({ slug: i.slug }));
}

export default async function IndependentProfile({ params }: PageProps<"/admin/users/independents/[slug]">) {
  const { slug } = await params;
  const account = independents.find((i) => i.slug === slug);
  if (!account) notFound();

  return (
    <AccountDetail
      title={account.name}
      backHref="/admin/users/independents"
      backLabel="Back to independent accounts"
      stats={account.stats}
      activity={account.activity}
      disputes={{ party: "independent", slug: account.slug }}
    />
  );
}
