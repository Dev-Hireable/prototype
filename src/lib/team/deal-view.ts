import type { Posting } from "@/lib/demo/deal";
import type { CompanyProfile, Role } from "@/lib/team/data";

/** The id both portals use for the one shared engagement. */
export const DEAL_ID = "deal";

/** A published role as the talent's job board needs it: the posting plus who is behind it. */
export function postingFrom(role: Role, company: CompanyProfile): Posting {
  return {
    slug: role.slug,
    title: role.title,
    type: role.type,
    hours: role.type === "part-time" ? role.hours : undefined,
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
    expectation: role.expectation,
    tasks: role.type === "trial" && role.tasks?.length ? role.tasks : undefined,
    attachment: role.attachment || undefined,
    duration: role.duration,
    hires: role.hires,
    posted: "Posted today",
    closes: "Open until filled",
  };
}
