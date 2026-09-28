import type { Tone } from "@/components/portal/Badge";

export type ActivityEvent = { event: string; actor: string; when: string };
export type Stat = { label: string; value: string; sub: string };

export type TeamBuilder = {
  slug: string;
  company: string;
  contact: string;
  plan: string;
  contracts: number;
  joined: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  activity: ActivityEvent[];
};

export type Independent = {
  slug: string;
  name: string;
  role: string;
  verification: string;
  contracts: number;
  joined: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  activity: ActivityEvent[];
};

/** Detail screens only exist for the first row of each list in the draft. */
const genericTeamBuilderStats = (plan: string, joined: string, contracts: number): Stat[] => [
  { label: "Plan", value: plan, sub: "renews monthly" },
  { label: "Joined", value: joined, sub: "—" },
  { label: "Contracts", value: String(contracts), sub: "—" },
  { label: "Lifetime spend", value: "—", sub: "not yet billed" },
];

export const teamBuilders: TeamBuilder[] = [
  {
    slug: "nairobi-solutions",
    company: "Nairobi Solutions",
    contact: "Alex Rivera",
    plan: "Growth",
    contracts: 4,
    joined: "12 Mar 2026",
    status: "Active",
    tone: "ok",
    stats: [
      { label: "Plan", value: "Growth", sub: "renews 12 Oct" },
      { label: "Joined", value: "12 Mar 2026", sub: "182 days" },
      { label: "Contracts", value: "4", sub: "1 trial · 3 full-time" },
      { label: "Lifetime spend", value: "$38,400", sub: "across 6 contracts" },
    ],
    activity: [
      { event: "Funded escrow — Sales Manager trial", actor: "Alex Rivera", when: "11 Sep 2026, 09:14" },
      { event: "Sent offer to Juan Dela Cruz", actor: "Alex Rivera", when: "10 Sep 2026, 16:02" },
      { event: "Published role — Growth Marketer", actor: "Alex Rivera", when: "09 Sep 2026, 11:47" },
      { event: "Payment method updated", actor: "Alex Rivera", when: "04 Sep 2026, 08:30" },
      { event: "Plan upgraded to Growth", actor: "system", when: "12 Aug 2026, 00:00" },
    ],
  },
  {
    slug: "brightline-health",
    company: "Brightline Health",
    contact: "Owen Price",
    plan: "Starter",
    contracts: 2,
    joined: "02 Mar 2026",
    status: "Active",
    tone: "ok",
    stats: genericTeamBuilderStats("Starter", "02 Mar 2026", 2),
    activity: [],
  },
  {
    slug: "orbit-media",
    company: "Orbit Media",
    contact: "Dana Whitfield",
    plan: "Growth",
    contracts: 1,
    joined: "28 Feb 2026",
    status: "Payment failed",
    tone: "danger",
    stats: genericTeamBuilderStats("Growth", "28 Feb 2026", 1),
    activity: [],
  },
  {
    slug: "kestrel-labs",
    company: "Kestrel Labs",
    contact: "Sam Oduya",
    plan: "Starter",
    contracts: 0,
    joined: "19 Feb 2026",
    status: "Suspended",
    tone: "danger",
    stats: genericTeamBuilderStats("Starter", "19 Feb 2026", 0),
    activity: [],
  },
  {
    slug: "vela-partners",
    company: "Vela Partners",
    contact: "Ana Reyes",
    plan: "Scale",
    contracts: 7,
    joined: "04 Feb 2026",
    status: "Active",
    tone: "ok",
    stats: genericTeamBuilderStats("Scale", "04 Feb 2026", 7),
    activity: [],
  },
];

const genericIndependentStats = (verification: string, joined: string, contracts: number): Stat[] => [
  { label: "Verification", value: verification, sub: "—" },
  { label: "Joined", value: joined, sub: "—" },
  { label: "Contracts", value: String(contracts), sub: contracts ? "active" : "none yet" },
  { label: "Trial fit score", value: "—", sub: "no trial in progress" },
];

export const independents: Independent[] = [
  {
    slug: "juan-dela-cruz",
    name: "Juan Dela Cruz",
    role: "Sales Manager",
    verification: "Verified",
    contracts: 1,
    joined: "08 Aug 2026",
    status: "On trial",
    tone: "trial",
    stats: [
      { label: "Verification", value: "Verified", sub: "ID + address, 09 Aug" },
      { label: "Joined", value: "08 Aug 2026", sub: "34 days" },
      { label: "Contracts", value: "1", sub: "Sales Manager, trial" },
      { label: "Trial fit score", value: "80%", sub: "phase 3 of 4" },
    ],
    activity: [
      { event: "Accepted trial offer — Nairobi Solutions", actor: "Juan Dela Cruz", when: "25 Aug 2026, 10:22" },
      { event: "Submitted proposal", actor: "Juan Dela Cruz", when: "22 Aug 2026, 14:05" },
      { event: "Completed work style quiz", actor: "Juan Dela Cruz", when: "09 Aug 2026, 08:11" },
      { event: "ID verification approved", actor: "admin: Admin Lead", when: "09 Aug 2026, 07:40" },
      { event: "Account created", actor: "Juan Dela Cruz", when: "08 Aug 2026, 19:55" },
    ],
  },
  {
    slug: "hanna-aquino",
    name: "Hanna Aquino",
    role: "Sales Ops Analyst",
    verification: "Verified",
    contracts: 1,
    joined: "21 Jul 2026",
    status: "On trial",
    tone: "trial",
    stats: genericIndependentStats("Verified", "21 Jul 2026", 1),
    activity: [],
  },
  {
    slug: "mia-santos",
    name: "Mia Santos",
    role: "Customer Success",
    verification: "Pending ID",
    contracts: 0,
    joined: "02 Sep 2026",
    status: "Awaiting review",
    tone: "warn",
    stats: genericIndependentStats("Pending ID", "02 Sep 2026", 0),
    activity: [],
  },
  {
    slug: "leo-ramos",
    name: "Leo Ramos",
    role: "BDR",
    verification: "Verified",
    contracts: 2,
    joined: "14 Jun 2026",
    status: "Full-time",
    tone: "accent",
    stats: genericIndependentStats("Verified", "14 Jun 2026", 2),
    activity: [],
  },
  {
    slug: "kris-tan",
    name: "Kris Tan",
    role: "Account Executive",
    verification: "Rejected",
    contracts: 0,
    joined: "29 Aug 2026",
    status: "Suspended",
    tone: "danger",
    stats: genericIndependentStats("Rejected", "29 Aug 2026", 0),
    activity: [],
  },
];
