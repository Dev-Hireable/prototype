import type { Deal, Posting } from "@/lib/demo/deal";
import type { CompanyProfile, Objective, Role } from "@/lib/team/data";

/** The id both portals use for the one shared engagement. */
export const DEAL_ID = "deal";

/** The shared contract's objectives in the Team Builder's own Objective shape. */
export function dealObjectivesFrom(contract: NonNullable<Deal["contract"]>): Objective[] {
  return contract.objectives.map((o) => ({
    id: o.id,
    title: o.title,
    kind: o.kind,
    progress: o.progress,
    status: o.status === "revision" ? "risk" : o.status,
    meta: o.meta,
    due: contract.ends,
    updated: o.updated,
  }));
}

/** A published role as the talent's job board needs it: the posting plus who is behind it. */
export function postingFrom(role: Role, company: CompanyProfile): Posting {
  return {
    slug: role.slug,
    title: role.title,
    type: role.type,
    company: company.name,
    companyBlurb: company.description,
    location: company.location,
    industry: company.industry,
    size: company.size,
    rate: role.budget,
    rateRange: role.budget,
    level: role.experience,
    description: [role.description],
    skills: role.skills,
    objectives: [],
    expectation: role.expectation,
    attachment: role.attachment || undefined,
    duration: role.duration,
    hires: role.hires,
    posted: "Posted today",
    closes: "Open until filled",
    workStyle: COMPANY_WORK_STYLE,
  };
}

/** The Team Builder's own work-style answers, which every match is measured against. */
export const COMPANY_WORK_STYLE = [5, 5, 2, 3, 2, 5];
