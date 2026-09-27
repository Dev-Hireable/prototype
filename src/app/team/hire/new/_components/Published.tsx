import Image from "next/image";
import { useState } from "react";
import { LinkButton, Page } from "@/components/independent/ui";
import { BADGE, type PathCopy } from "../_lib/wizard";

/** The last step: the post is live, with the way on to its applicants. */
export function Published({ t, slug }: { t: PathCopy; slug: string }) {
  return (
    <Page title="Create Role" padded={false}>
      <div className="flex h-full flex-col items-center justify-center gap-6 px-10 py-20">
        <PublishedBadge />
        <div className="flex w-[733px] flex-col items-center gap-10 px-10">
          <div className="flex w-[378px] flex-col items-center gap-2 text-center text-ink">
            <h2 className="font-display text-[32px] leading-[1.5] font-semibold" style={{ fontVariationSettings: '"opsz" 14' }}>
              {t.publishedTitle}
            </h2>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{t.publishedBody}</p>
          </div>
          <div className="flex gap-2">
            <LinkButton size="lg" href="/team">
              Back to dashboard
            </LinkButton>
            <LinkButton size="lg" variant="primary" href={`/team/hire/roles/${slug}`}>
              Track applicants
            </LinkButton>
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Stays hidden until the image is in, then grows in (globals.css .badge-pop) instead of popping. */
function PublishedBadge() {
  const [loaded, setLoaded] = useState(false);
  return <Image {...BADGE} loading="eager" fetchPriority="high" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className={`h-[140px] w-[141px] ${loaded ? "badge-pop" : "opacity-0"}`} />;
}
