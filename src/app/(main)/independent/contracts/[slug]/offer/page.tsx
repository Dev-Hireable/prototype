import { redirect } from "next/navigation";

/**
 * TB-072 / IN-084 — the post-trial offer isn't a page of its own any more: it opens as a dialog over
 * the contract it continues (ConversionOfferDialog), from the contract's banner or the offer's entry
 * in Messages. An old link, bookmark or notification lands on the contract with it open.
 */
export default async function ContractOffer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/independent/contracts/${slug}?offer=open`);
}
