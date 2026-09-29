import { ICONS } from "@/components/icons";
import { Button, Card, LinkButton } from "@/components/portal/ui";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { Role } from "@/lib/independent/data";
import type { Standing } from "../_lib/standing";

const DM = { fontVariationSettings: '"opsz" 14' };
const Pin = ICONS.location;
const People = ICONS.people;
const Business = ICONS.business;
const Out = ICONS.northEast;
const Saved = ICONS.bookmark;
const Save = ICONS.saved;

const bare = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/** The company's site as a link — https:// added when it was given without a scheme — or null when there's none. */
const siteLink = (site: string | undefined) => (site ? (/^https?:\/\//.test(site) ? site : `https://${site}`) : null);

/**
 * The company card, with the actions: who's hiring, then applying — or the application already on
 * file — and saving the role, with a note on why it can't be applied to when it can't.
 */
export function CompanyCard({ role, site, standing, isSaved, onApply, onToggleSaved }: { role: Role; site: string | undefined; standing: Standing; isSaved: boolean; onApply: () => void; onToggleSaved: () => void }) {
  const { application, blocked, cta } = standing;
  return (
    <Card className="flex flex-col gap-5 p-5">
      <AboutCompany role={role} site={site} />
      <div className="flex flex-col gap-2">
        {/* An application already on file opens from here, rather than a greyed-out "Applied". */}
        {application ? (
          <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${application.id}`}>
            View application
          </LinkButton>
        ) : (
          <Button size="lg" variant="primary" disabled={blocked} onClick={onApply}>
            {cta}
          </Button>
        )}
        <Button size="lg" onClick={onToggleSaved}>
          {isSaved ? <Saved size={18} aria-hidden className="text-primary" /> : <Save size={18} aria-hidden />}
          {isSaved ? "Saved" : "Save role"}
        </Button>
      </div>
      <WhyClosed role={role} standing={standing} />
    </Card>
  );
}

/** Who's hiring: the company and its industry, its blurb, and where it is, its size, the openings and its site. */
function AboutCompany({ role, site }: { role: Role; site: string | undefined }) {
  const website = siteLink(site);
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#5b5bd6] text-[18px] leading-none font-semibold text-white">{role.initials}</span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate font-display text-[18px] leading-[1.3] font-semibold text-ink" style={DM}>
            {role.company}
          </h3>
          {role.about.industry && <p className="truncate text-[13px] leading-[1.3] text-ink-2">{role.about.industry}</p>}
        </div>
      </div>
      {role.about.blurb && <p className="text-[14px] leading-[1.45] text-ink-2">{role.about.blurb}</p>}
      <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
        {role.about.location && (
          <li className="flex items-center gap-2">
            <Pin size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.about.location}
          </li>
        )}
        {role.about.size && (
          <li className="flex items-center gap-2">
            <People size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.about.size.replace("-", "–")} people
          </li>
        )}
        <li className="flex items-center gap-2">
          <Business size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.hires} {role.hires === 1 ? "opening" : "openings"} · {JOB_TYPE_LABEL[role.type]}
        </li>
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

/** Under the buttons, each reason that holds for why the role can't be applied to. */
function WhyClosed({ role, standing }: { role: Role; standing: Standing }) {
  const { withdrawn, declined, applied, closed, engagedNote } = standing;
  return (
    <>
      {withdrawn && <p className="text-[12px] leading-[1.4] text-danger">You withdrew this application and cannot apply to this role again.</p>}
      {declined && <p className="text-[12px] leading-[1.4] text-ink-2">{role.company} did not move forward with your application for this role, so it cannot be applied to again.</p>}
      {role.filled && !applied && <p className="text-[12px] leading-[1.4] text-ink-2">This role has been filled and is no longer taking applications.</p>}
      {closed && !applied && !role.filled && <p className="text-[12px] leading-[1.4] text-ink-2">{role.company} has closed this role, so it is no longer taking applications.</p>}
      {engagedNote && (
        <p className="text-[12px] leading-[1.4] text-ink-2">
          You already have an engagement with {engagedNote.company} on {engagedNote.title}. The demo runs one engagement at a time —{" "}
          {engagedNote.withdrawable ? "withdraw that application first, or use Reset demo at the top right." : "it's a signed contract, so use Reset demo at the top right to start another."}
        </p>
      )}
    </>
  );
}
