import Image from "next/image";
import { useState } from "react";
import { LinkButton, Page, Toast } from "@/components/portal/ui";
import { IndependentCard, ProfileDrawer } from "@/components/team/ui";
import { useToast } from "@/lib/portal/toast";
import { liveIndependents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useHired } from "@/lib/team/hired";
import { usePipeline } from "@/lib/team/pipeline";
import { BADGE, topMatches } from "../_lib/wizard";

/** The last step: the role is live, with its best matches to invite right here and the way on to its candidates. */
export function Published({ slug }: { slug: string }) {
  return (
    <Page title="Create Role" padded={false}>
      <div className="flex h-full flex-col items-center justify-center gap-6 px-(--page-gutter) py-20">
        <PublishedBadge />
        <div className="flex w-full max-w-[733px] flex-col items-center gap-10 px-(--page-gutter)">
          <div className="flex w-[378px] max-w-full flex-col items-center gap-2 text-center text-ink">
            <h2 className="font-display text-[32px] leading-[1.5] font-semibold" style={{ fontVariationSettings: '"opsz" 14' }}>
              Role published
            </h2>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px]">Your role is live. Invite your best matches below.</p>
          </div>
          <BestMatches slug={slug} />
          <div className="flex gap-2">
            <LinkButton size="lg" href="/team">
              Back to dashboard
            </LinkButton>
            <LinkButton size="lg" variant="primary" href={`/team/hire/roles/${slug}`}>
              View candidates
            </LinkButton>
          </div>
        </div>
      </div>
    </Page>
  );
}

/**
 * The Independents who match best, on Discover's card, each inviting straight to the role just
 * published: there's no role to pick. A name opens their profile in the preview sheet, whose Invite
 * does the same.
 */
function BestMatches({ slug }: { slug: string }) {
  const { invite, candidates } = usePipeline();
  const { nameOf } = useHired();
  const [preview, setPreview] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();
  const people = topMatches(liveIndependents());
  const inviteTo = (p: Independent) => {
    setPreview(null);
    const already = candidates.some((c) => c.independent === p.slug && c.role === slug);
    if (!already) invite(p.slug, slug);
    setToast(already ? `${nameOf(p)} is already in this role's pipeline` : `Invite sent to ${nameOf(p)}`, already ? "info" : "success");
  };
  if (people.length === 0) return null;
  return (
    <section aria-label="Best matches" className="flex w-full flex-col gap-3">
      {people.map((p) => (
        <IndependentCard key={p.slug} person={p} onInvite={() => inviteTo(p)} onOpen={setPreview} />
      ))}
      <ProfileDrawer person={preview} onClose={() => setPreview(null)} onInvite={inviteTo} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}

/** Stays hidden until the image is in, then grows in (globals.css .badge-pop) instead of popping. */
function PublishedBadge() {
  const [loaded, setLoaded] = useState(false);
  return <Image {...BADGE} loading="eager" fetchPriority="high" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className={`h-[140px] w-[141px] ${loaded ? "badge-pop" : "opacity-0"}`} />;
}
