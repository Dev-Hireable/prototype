import type { IconType } from "react-icons";
import { ICONS } from "@/components/icons";
import { CompanyMark } from "@/components/portal/company-mark";

const DM = { fontVariationSettings: '"opsz" 14' };
const Out = ICONS.northEast;

/** One line of facts under the company, with its icon (where it is, its size, the openings…). */
export type CompanyFact = { icon: IconType; text: string };

const bare = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/** The company's site as a link — https:// added when it was given without a scheme — or null when there's none. */
const siteLink = (site: string | undefined) => (site ? (/^https?:\/\//.test(site) ? site : `https://${site}`) : null);

/**
 * Who's hiring, the same on a role's page and on an application: the company's mark and name (and
 * its industry under it), its blurb, then a line per fact and its site. The facts left empty are
 * dropped, so a caller lists them all and passes what it knows.
 */
export function AboutCompany({ name, initials, industry, blurb, facts, site }: { name: string; initials: string; industry?: string; blurb?: string; facts: CompanyFact[]; site?: string }) {
  const website = siteLink(site);
  return (
    <>
      <div className="flex items-center gap-3">
        <CompanyMark initials={initials} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate font-display text-[18px] leading-[1.3] font-semibold text-ink" style={DM}>
            {name}
          </h3>
          {industry && <p className="truncate text-[13px] leading-[1.3] text-ink-2">{industry}</p>}
        </div>
      </div>
      {blurb && <p className="text-[14px] leading-[1.45] text-ink-2">{blurb}</p>}
      <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
        {facts
          .filter((f) => f.text)
          .map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon size={18} aria-hidden className="shrink-0 text-ink-2" /> {text}
            </li>
          ))}
        {website && (
          <li>
            <a href={website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 font-medium text-primary hover:underline">
              <Out size={18} aria-hidden className="shrink-0" /> <span className="truncate">{bare(website)}</span>
            </a>
          </li>
        )}
      </ul>
    </>
  );
}
