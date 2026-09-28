import type { Tone } from "@/components/portal/Badge";

export const platformStats = [
  { label: "Team Builders", value: "248", sub: "+12 this month" },
  { label: "Independents", value: "1,906", sub: "+83 this month" },
  { label: "Active contracts", value: "137", sub: "41 trial · 96 full-time" },
  { label: "Held in escrow", value: "$214,800", sub: "across 41 trials" },
];

/** Bar heights are exactly value × 0.5625 px (320 units over 180 px). */
export const signups = {
  categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
  max: 320,
  ticks: [0, 80, 160, 240, 320],
  series: [
    { label: "Independents", color: "#1770d9", values: [118, 142, 96, 154, 188, 206, 248, 283] },
    { label: "Employers", color: "#99c7f5", values: [41, 52, 33, 48, 61, 58, 74, 83] },
  ],
};

export const trialOutcomes = {
  centerValue: "71%",
  centerLabel: "converted",
  unit: "trials",
  slices: [
    { label: "Converted to full-time", count: 29, color: "#27ae60" },
    { label: "Ended, no offer", count: 9, color: "#f7ba00" },
    { label: "Disputed", count: 3, color: "#c3c3c3" },
  ],
};

export type AttentionItem = {
  item: string;
  type: string;
  raisedBy: string;
  age: string;
  status: string;
  tone: Tone;
  href: string;
};

/** The sample items. Open disputes are added in front of them, live, by the dashboard. */
export const needsAttention: AttentionItem[] = [
  {
    item: "Payout method missing before trial end",
    type: "Account",
    raisedBy: "Hanna Aquino",
    age: "2 days",
    status: "Pending review",
    tone: "warn",
    href: "/admin/users/independents/hanna-aquino",
  },
  {
    item: "Role flagged by automated check",
    type: "Role",
    raisedBy: "Brightline Health",
    age: "1 day",
    status: "Awaiting approval",
    tone: "warn",
    href: "/admin/roles/customer-success-lead",
  },
  {
    item: "Subscription payment failed",
    type: "Billing",
    raisedBy: "Orbit Media",
    age: "6 hours",
    status: "Retrying",
    tone: "warn",
    href: "/admin/billing/trx-2026-0911",
  },
  {
    item: "Duplicate independent account",
    type: "Account",
    raisedBy: "—",
    age: "5 hours",
    status: "Needs merge",
    tone: "warn",
    href: "/admin/users/independents/hanna-aquino",
  },
];
