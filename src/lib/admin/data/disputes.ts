import type { Tone } from "@/components/admin/ui";
import type { ActivityEvent, Stat } from "@/lib/admin/data/users";

/** Content transcribed from the "Disputes" section in Figma. */

export type ProcessCheck = { check: string; result: string; source: string };

export type Dispute = {
  slug: string;
  dispute: string;
  contract: string;
  raisedBy: string;
  amount: string;
  age: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  checks: ProcessCheck[];
  timeline: ActivityEvent[];
};

const genericStats = (raisedBy: string, against: string, amount: string, age: string): Stat[] => [
  { label: "Raised by", value: raisedBy, sub: "—" },
  { label: "Against", value: against, sub: "—" },
  { label: "Amount in question", value: amount, sub: "held in escrow" },
  { label: "Age", value: age, sub: "SLA 5 days" },
];

export const disputes: Dispute[] = [
  {
    slug: "escrow-sales-manager",
    dispute: "Escrow not released after trial end",
    contract: "Sales Manager — trial",
    raisedBy: "Juan Dela Cruz",
    amount: "$1,600",
    age: "3 days",
    status: "Pending review",
    tone: "warn",
    stats: [
      { label: "Raised by", value: "Juan Dela Cruz", sub: "independent" },
      { label: "Against", value: "Nairobi Solutions", sub: "team builder" },
      { label: "Amount in question", value: "$1,600", sub: "held in escrow" },
      { label: "Age", value: "3 days", sub: "SLA 5 days" },
    ],
    checks: [
      { check: "Trial end date has passed", result: "Pass — ended 08 Sep 2026", source: "contract" },
      { check: "Evaluation submitted by employer", result: "Fail — not submitted", source: "trial dashboard" },
      { check: "Objectives marked done by independent", result: "Pass — 5 of 6 approved", source: "activity log" },
      { check: "Revision requested within window", result: "Pass — 1 request, 02 Sep", source: "objective log" },
      { check: "Escrow funded at offer", result: "Pass — $1,600 on 25 Aug", source: "payments" },
    ],
    timeline: [
      { event: "Dispute filed", actor: "Juan Dela Cruz", when: "08 Sep 2026, 18:02" },
      { event: "Employer notified", actor: "system", when: "08 Sep 2026, 18:02" },
      { event: "Evidence requested from employer", actor: "admin: R. Milano", when: "09 Sep 2026, 09:30" },
    ],
  },
  {
    slug: "work-not-delivered",
    dispute: "Work not delivered as agreed",
    contract: "Sales Ops Analyst — trial",
    raisedBy: "Orbit Media",
    amount: "$1,200",
    age: "6 days",
    status: "In review",
    tone: "warn",
    stats: genericStats("Orbit Media", "Mia Santos", "$1,200", "6 days"),
    checks: [],
    timeline: [],
  },
  {
    slug: "objective-without-evidence",
    dispute: "Objective marked done without evidence",
    contract: "BDR — full-time",
    raisedBy: "Vela Partners",
    amount: "$900",
    age: "11 days",
    status: "Awaiting evidence",
    tone: "warn",
    stats: genericStats("Vela Partners", "Leo Ramos", "$900", "11 days"),
    checks: [],
    timeline: [],
  },
  {
    slug: "payment-released-in-error",
    dispute: "Payment released in error",
    contract: "Customer Success — full-time",
    raisedBy: "Brightline Health",
    amount: "$1,400",
    age: "18 days",
    status: "Resolved",
    tone: "ok",
    stats: genericStats("Brightline Health", "Mia Santos", "$1,400", "18 days"),
    checks: [],
    timeline: [],
  },
  {
    slug: "trial-ended-early",
    dispute: "Trial ended early by employer",
    contract: "Account Executive — trial",
    raisedBy: "Kris Tan",
    amount: "$800",
    age: "24 days",
    status: "Closed",
    tone: "neutral",
    stats: genericStats("Kris Tan", "Vela Partners", "$800", "24 days"),
    checks: [],
    timeline: [],
  },
];
