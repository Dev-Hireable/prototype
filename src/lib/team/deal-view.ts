import type { Deal, Posting } from "@/lib/demo/deal";
import { dayLabel } from "@/lib/demo/dates";
import type { CompanyProfile, Objective, Role } from "@/lib/team/data";

/** The id both portals use for the one shared engagement. */
export const DEAL_ID = "deal";

/**
 * The shared contract's objectives in the Team Builder's own Objective shape — everything the
 * talent logged comes across (the latest update, its history, key results, the discussion), and a
 * revision request stays a revision request rather than reading as "At risk".
 */
export function dealObjectivesFrom(contract: NonNullable<Deal["contract"]>, fullTime = false): Objective[] {
  return contract.objectives.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    kind: o.kind,
    progress: o.progress,
    status: o.status,
    meta: o.meta,
    due: fullTime ? undefined : dayLabel(contract.ends),
    keyResults: o.keyResults,
    target: o.target,
    unit: o.unit,
    current: o.current,
    trend: o.trend,
    updated: o.updated,
    retired: o.retired,
    activity: o.activity,
    lastUpdate: o.lastUpdate,
    comments: o.comments,
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
    website: company.url || undefined,
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
