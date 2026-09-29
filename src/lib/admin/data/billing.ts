import type { Tone } from "@/lib/portal/tone";
import type { Stat } from "@/lib/admin/data/users";

export type BreakdownLine = { line: string; amount: string; total?: boolean };
export type LinkedRecord = { record: string; reference: string; href?: string };

export type Transaction = {
  slug: string;
  reference: string;
  company: string;
  type: string;
  amount: string;
  date: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  breakdown: BreakdownLine[];
  linked: LinkedRecord[];
};

const genericStats = (type: string, amount: string, company: string, status: string, date: string): Stat[] => [
  { label: "Type", value: type, sub: "—" },
  { label: "Amount", value: amount, sub: "—" },
  { label: "Company", value: company, sub: "—" },
  { label: "Status", value: status, sub: `since ${date}` },
];

export const transactions: Transaction[] = [
  {
    slug: "trx-2026-0914",
    reference: "TRX-2026-0914",
    company: "Nairobi Solutions",
    type: "Escrow deposit",
    amount: "$1,600",
    date: "11 Sep 2026",
    status: "Held",
    tone: "warn",
    stats: [
      { label: "Type", value: "Escrow deposit", sub: "held, not released" },
      { label: "Amount", value: "$1,600", sub: "platform fee $160" },
      { label: "Company", value: "Nairobi Solutions", sub: "Growth plan" },
      { label: "Status", value: "Held", sub: "since 11 Sep 2026" },
    ],
    breakdown: [
      { line: "Trial rate — Sales Manager, 30 days", amount: "$1,600.00" },
      { line: "Platform fee (10%)", amount: "$160.00" },
      { line: "Processing fee", amount: "$46.40" },
      { line: "Total charged", amount: "$1,806.40", total: true },
      { line: "Held for release to independent", amount: "$1,600.00" },
    ],
    linked: [
      {
        record: "Contract",
        reference: "Sales Manager — trial, Nairobi Solutions",
        href: "/admin/roles/sales-manager",
      },
      { record: "Independent", reference: "Juan Dela Cruz", href: "/admin/users/independents/juan-dela-cruz" },
      // Disputes are live records now; this static billing sample no longer claims one exists.
      { record: "Disputes", reference: "Any dispute on this contract", href: "/admin/disputes" },
    ],
  },
  {
    slug: "trx-2026-0913",
    reference: "TRX-2026-0913",
    company: "Vela Partners",
    type: "Subscription",
    amount: "$499",
    date: "04 Sep 2026",
    status: "Paid",
    tone: "ok",
    stats: genericStats("Subscription", "$499", "Vela Partners", "Paid", "04 Sep 2026"),
    breakdown: [
      { line: "Scale plan — monthly", amount: "$499.00" },
      { line: "Total charged", amount: "$499.00", total: true },
    ],
    linked: [{ record: "Subscription", reference: "Vela Partners", href: "/admin/subscriptions/vela-partners" }],
  },
  {
    slug: "trx-2026-0912",
    reference: "TRX-2026-0912",
    company: "Brightline Health",
    type: "Escrow release",
    amount: "$1,400",
    date: "02 Sep 2026",
    status: "Paid out",
    tone: "ok",
    stats: genericStats("Escrow release", "$1,400", "Brightline Health", "Paid out", "02 Sep 2026"),
    breakdown: [
      { line: "Released to independent", amount: "$1,400.00" },
      { line: "Total released", amount: "$1,400.00", total: true },
    ],
    linked: [
      { record: "Team builder", reference: "Brightline Health", href: "/admin/users/brightline-health" },
    ],
  },
  {
    slug: "trx-2026-0911",
    reference: "TRX-2026-0911",
    company: "Orbit Media",
    type: "Subscription",
    amount: "$249",
    date: "28 Aug 2026",
    status: "Failed",
    tone: "danger",
    stats: genericStats("Subscription", "$249", "Orbit Media", "Failed", "28 Aug 2026"),
    breakdown: [
      { line: "Growth plan — monthly", amount: "$249.00" },
      { line: "Total attempted", amount: "$249.00", total: true },
    ],
    linked: [{ record: "Subscription", reference: "Orbit Media", href: "/admin/subscriptions/orbit-media" }],
  },
  {
    slug: "trx-2026-0910",
    reference: "TRX-2026-0910",
    company: "Kestrel Labs",
    type: "Refund",
    amount: "$99",
    date: "19 Aug 2026",
    status: "Refunded",
    tone: "accent",
    stats: genericStats("Refund", "$99", "Kestrel Labs", "Refunded", "19 Aug 2026"),
    breakdown: [
      { line: "Starter plan — refunded", amount: "$99.00" },
      { line: "Total refunded", amount: "$99.00", total: true },
    ],
    linked: [{ record: "Subscription", reference: "Kestrel Labs", href: "/admin/subscriptions/kestrel-labs" }],
  },
];
