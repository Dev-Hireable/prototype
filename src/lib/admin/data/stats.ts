import type { Stat } from "@/lib/admin/data/users";

export const platformKpis: Stat[] = [
  { label: "Sign-ups, 30 days", value: "331", sub: "248 independents · 83 employers" },
  { label: "Trials started", value: "62", sub: "+18% vs last 30 days" },
  { label: "Trial → full-time", value: "71%", sub: "target 80%" },
  { label: "Avg. trial fit score", value: "83%", sub: "across 41 completed trials" },
];

export type Cohort = { cohort: string; signups: string; trials: string; converted: string; rate: string };

export const cohorts: Cohort[] = [
  { cohort: "Jul 2026", signups: "118", trials: "24", converted: "18", rate: "75%" },
  { cohort: "Jun 2026", signups: "142", trials: "31", converted: "21", rate: "68%" },
  { cohort: "May 2026", signups: "96", trials: "19", converted: "14", rate: "74%" },
  { cohort: "Apr 2026", signups: "71", trials: "14", converted: "9", rate: "64%" },
];

export const revenueKpis: Stat[] = [
  { label: "MRR", value: "$18,420", sub: "+9.4% vs Aug" },
  { label: "New subscriptions", value: "14", sub: "2 downgrades" },
  { label: "Escrow throughput", value: "$214,800", sub: "41 active trials" },
  { label: "Platform fees, 30 days", value: "$21,480", sub: "10% of throughput" },
];

export type PlanRevenue = { plan: string; accounts: string; mrr: string; share: string; churn: string };

export const revenueByPlan: PlanRevenue[] = [
  { plan: "Scale", accounts: "9", mrr: "$4,491", share: "24%", churn: "0%" },
  { plan: "Growth", accounts: "38", mrr: "$9,462", share: "51%", churn: "5.3%" },
  { plan: "Starter", accounts: "45", mrr: "$4,455", share: "24%", churn: "11.1%" },
  { plan: "Trialling, unpaid", accounts: "7", mrr: "—", share: "—", churn: "—" },
];
