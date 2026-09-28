import type { Tone } from "@/components/portal/Badge";
import type { Stat } from "@/lib/admin/data/users";

export type Check = { check: string; result: string; pass: boolean; checked: string };

export type Role = {
  slug: string;
  role: string;
  company: string;
  type: string;
  applicants: string;
  posted: string;
  status: string;
  tone: Tone;
  stats: Stat[];
  checks: Check[];
};

const pass = (check: string, checked = "25 Aug 2026"): Check => ({ check, result: "Pass", pass: true, checked });

const genericStats = (company: string, type: string, applicants: string): Stat[] => [
  { label: "Company", value: company, sub: "—" },
  { label: "Type", value: type, sub: type === "Trial" ? "30 days" : "permanent" },
  { label: "Budget", value: "—", sub: "not set" },
  { label: "Applicants", value: applicants, sub: "—" },
];

const genericChecks = (checked: string): Check[] => [
  pass("Budget within platform range", checked),
  pass("Description screened for restricted terms", checked),
  pass("Company profile complete", checked),
  pass("Trial tasks present", checked),
];

export const roles: Role[] = [
  {
    slug: "sales-manager",
    role: "Sales Manager",
    company: "Nairobi Solutions",
    type: "Trial",
    applicants: "24",
    posted: "25 Aug 2026",
    status: "Active",
    tone: "ok",
    stats: [
      { label: "Company", value: "Nairobi Solutions", sub: "Growth plan" },
      { label: "Type", value: "Trial", sub: "30 days" },
      { label: "Budget", value: "$1,600 /mo", sub: "suggested $1,400–1,800" },
      { label: "Applicants", value: "24", sub: "6 matched" },
    ],
    checks: [
      pass("Budget within platform range"),
      pass("Description screened for restricted terms"),
      pass("Company profile complete"),
      {
        check: "Duplicate of an existing active role",
        result: "Review — 82% match to Growth Marketer",
        pass: false,
        checked: "25 Aug 2026",
      },
      pass("Trial tasks present"),
    ],
  },
  {
    slug: "customer-success-lead",
    role: "Customer Success Lead",
    company: "Brightline Health",
    type: "Full-time",
    applicants: "11",
    posted: "02 Mar 2026",
    status: "Active",
    tone: "ok",
    stats: genericStats("Brightline Health", "Full-time", "11"),
    checks: genericChecks("02 Mar 2026"),
  },
  {
    slug: "growth-marketer",
    role: "Growth Marketer",
    company: "Nairobi Solutions",
    type: "Trial",
    applicants: "—",
    posted: "09 Sep 2026",
    status: "Draft",
    tone: "neutral",
    stats: genericStats("Nairobi Solutions", "Trial", "—"),
    checks: genericChecks("09 Sep 2026"),
  },
  {
    slug: "account-executive",
    role: "Account Executive",
    company: "Vela Partners",
    type: "Trial",
    applicants: "19",
    posted: "18 Aug 2026",
    status: "Flagged",
    tone: "danger",
    stats: genericStats("Vela Partners", "Trial", "19"),
    checks: [
      pass("Budget within platform range", "18 Aug 2026"),
      {
        check: "Description screened for restricted terms",
        result: "Review — flagged by automated check",
        pass: false,
        checked: "18 Aug 2026",
      },
      pass("Company profile complete", "18 Aug 2026"),
      pass("Trial tasks present", "18 Aug 2026"),
    ],
  },
  {
    slug: "sales-ops-analyst",
    role: "Sales Ops Analyst",
    company: "Orbit Media",
    type: "Trial",
    applicants: "7",
    posted: "21 Jul 2026",
    status: "Closed",
    tone: "neutral",
    stats: genericStats("Orbit Media", "Trial", "7"),
    checks: genericChecks("21 Jul 2026"),
  },
];
