import { redirect } from "next/navigation";

/**
 * The trial offer's own page is retired: the offer opens over its application, in a dialog
 * (IN-074). An old link to it (a notification, a thread entry, a bookmark) lands there with the
 * offer open, keeping where it came from for the application's back link.
 */
export default async function Offer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { from } = await searchParams;
  redirect(`/independent/jobs/applications/${encodeURIComponent(id)}?offer=1${typeof from === "string" ? `&from=${encodeURIComponent(from)}` : ""}`);
}
