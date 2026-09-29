import type { Tone } from "@/lib/portal/tone";
import type { Stat } from "@/lib/admin/data/users";

export type PlanChange = { change: string; by: string; effective: string };

export type Subscription = {
  slug: string;
  company: string;
  plan: string;
  seats: string;
  mrr: string;
  renews: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  history: PlanChange[];
};

const genericStats = (plan: string, mrr: string, seats: string, renews: string): Stat[] => [
  { label: "Plan", value: plan, sub: `${mrr} /mo` },
  { label: "Seats", value: seats, sub: "—" },
  { label: "Started", value: "—", sub: "—" },
  { label: "Next charge", value: renews, sub: "—" },
];

export const subscriptions: Subscription[] = [
  {
    slug: "vela-partners",
    company: "Vela Partners",
    plan: "Scale",
    seats: "12",
    mrr: "$499",
    renews: "04 Oct 2026",
    status: "Active",
    tone: "ok",
    stats: genericStats("Scale", "$499", "12", "04 Oct 2026"),
    history: [],
  },
  {
    slug: "nairobi-solutions",
    company: "Nairobi Solutions",
    plan: "Growth",
    seats: "5",
    mrr: "$249",
    renews: "12 Oct 2026",
    status: "Active",
    tone: "ok",
    stats: [
      { label: "Plan", value: "Growth", sub: "$249 /mo" },
      { label: "Seats", value: "5 of 10", sub: "2 added this cycle" },
      { label: "Started", value: "12 Aug 2026", sub: "1 upgrade" },
      { label: "Next charge", value: "12 Oct 2026", sub: "card ending 4182" },
    ],
    history: [
      { change: "Upgraded Starter → Growth", by: "Alex Rivera", effective: "12 Aug 2026" },
      { change: "Seats 3 → 5", by: "Alex Rivera", effective: "01 Sep 2026" },
      { change: "Payment method updated", by: "Alex Rivera", effective: "04 Sep 2026" },
      { change: "Subscription created", by: "Alex Rivera", effective: "12 Mar 2026" },
    ],
  },
  {
    slug: "brightline-health",
    company: "Brightline Health",
    plan: "Starter",
    seats: "2",
    mrr: "$99",
    renews: "02 Oct 2026",
    status: "Active",
    tone: "ok",
    stats: genericStats("Starter", "$99", "2", "02 Oct 2026"),
    history: [],
  },
  {
    slug: "orbit-media",
    company: "Orbit Media",
    plan: "Growth",
    seats: "5",
    mrr: "$249",
    renews: "28 Sep 2026",
    status: "Payment failed",
    tone: "danger",
    stats: genericStats("Growth", "$249", "5", "28 Sep 2026"),
    history: [],
  },
  {
    slug: "kestrel-labs",
    company: "Kestrel Labs",
    plan: "Starter",
    seats: "1",
    mrr: "$99",
    renews: "—",
    status: "Cancelled",
    tone: "danger",
    stats: genericStats("Starter", "$99", "1", "—"),
    history: [],
  },
];
