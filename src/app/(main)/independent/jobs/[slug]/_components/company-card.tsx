import { ICONS } from "@/components/icons";
import { AboutCompany } from "@/components/independent/about-company";
import { Button, Card, LinkButton } from "@/components/portal/ui";
import { SaveButton as SaveRoleButton } from "@/components/portal/save-toggle";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { Role } from "@/lib/independent/data";
import type { Standing } from "../_lib/standing";

const Pin = ICONS.location;
const People = ICONS.people;
const Business = ICONS.business;

/** What the role's two buttons need: where the talent stands with it, and what applying and saving do. */
type Actions = { standing: Standing; isSaved: boolean; onApply: () => void; onToggleSaved: () => void };

/**
 * The company card, with the actions: who's hiring, then applying — or the application already on
 * file — and saving the role, with a note on why it can't be applied to when it can't. While the
 * buttons lead somewhere (`pinned`), a phone has them in the bar along the bottom instead (ApplyBar).
 */
export function CompanyCard({ role, site, pinned, ...actions }: Actions & { role: Role; site: string | undefined; pinned: boolean }) {
  return (
    <Card className="flex flex-col gap-5 p-5">
      <RoleCompany role={role} site={site} />
      {/* data-tour: the role's tour points at Apply, or View application once one is on file (@/lib/portal/tours). */}
      <div data-tour="role-apply" className={`flex flex-col gap-2 ${pinned ? "max-md:hidden" : ""}`}>
        <ApplyButton {...actions} />
        <SaveButton {...actions} />
      </div>
      <WhyClosed role={role} standing={actions.standing} />
    </Card>
  );
}

/**
 * A phone's bar of the same two buttons along the bottom of the screen, pinned while the role scrolls
 * under it, as the role wizard pins Next: the card that holds them comes last on a phone, under the
 * whole role. Saving on the left and the main action on the right, a thumb's reach each. It's only for
 * buttons that lead somewhere (Apply, or the application on file): a role that can't be applied to
 * keeps them in its card, beside the notes that say why. -mb-12 takes back the page's bottom padding,
 * so at the end of the page the bar stays down on the tab bar instead of rising off it.
 */
export function ApplyBar(actions: Actions) {
  return (
    <div data-tour="role-apply" className="sticky bottom-0 z-10 -mx-(--page-gutter) -mb-12 flex gap-3 self-stretch border-t border-border bg-white px-(--page-gutter) py-3 md:hidden *:flex-1">
      <SaveButton {...actions} />
      <ApplyButton {...actions} />
    </div>
  );
}

/** Apply — or, once an application is on file, the way to it rather than a greyed-out "Applied". */
function ApplyButton({ standing: { application, blocked, cta }, onApply }: Actions) {
  return application ? (
    <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${application.id}`}>
      View application
    </LinkButton>
  ) : (
    <Button size="lg" variant="primary" disabled={blocked} onClick={onApply}>
      {cta}
    </Button>
  );
}

/** Saving the role, or unsaving it. */
function SaveButton({ isSaved, onToggleSaved }: Actions) {
  return <SaveRoleButton size="lg" label="Save role" isSaved={isSaved} onToggle={onToggleSaved} />;
}

/** Who's hiring: the company and its industry, its blurb, and where it is, its size, the openings and its site. */
function RoleCompany({ role, site }: { role: Role; site: string | undefined }) {
  const { location, size, industry, blurb } = role.about;
  const facts = [
    { icon: Pin, text: location },
    { icon: People, text: size ? `${size.replace("-", "–")} people` : "" },
    { icon: Business, text: `${role.hires} ${role.hires === 1 ? "opening" : "openings"} · ${JOB_TYPE_LABEL[role.type]}` },
  ];
  return <AboutCompany name={role.company} initials={role.initials} industry={industry} blurb={blurb} facts={facts} site={site} />;
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
          You already have an engagement with {engagedNote.company} on {engagedNote.title}. The demo runs one engagement at a time:{" "}
          {engagedNote.withdrawable ? "withdraw that application first, or use Reset demo at the top right." : "it's a signed contract, so use Reset demo at the top right to start another."}
        </p>
      )}
    </>
  );
}
