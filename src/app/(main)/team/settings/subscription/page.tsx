"use client";

import { Button, Card, CardHeading, Chip, Page, StatusDot, Toast } from "@/components/portal/ui";
import { useToast } from "@/lib/portal/toast";
import { PLAN, PLANS, planRenewal } from "@/lib/team/data";

type Plan = (typeof PLANS)[number];

/** TB-101 "View Subscription Plan": read-only, with the upgrade as the one way to move plan and the billing portal for the rest. */
export default function Subscription() {
  const [toast, setToast] = useToast();
  const current = PLANS.find((p) => p.name === PLAN.name) ?? PLANS[0];

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6 max-sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <CardHeading>Subscription</CardHeading>
          <StatusDot tone="ok">Active</StatusDot>
        </div>

        <PlanTerms current={current} />

        <div className="flex flex-col gap-2">
          <p className="text-[14px] leading-[1.4] font-medium text-ink">What’s included</p>
          <ul className="flex flex-col gap-2">
            {current.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13.5px] leading-[1.45] text-ink">
                <span className="size-2 shrink-0 rounded-full bg-ok" /> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Read-only otherwise: upgrade, or the billing portal for cancelling and billing changes. */}
        <div className="flex justify-end gap-3 max-sm:flex-col-reverse max-sm:*:w-full">
          <Button size="lg" onClick={() => setToast("Billing portal opens here", "info")}>
            Cancel or change billing
          </Button>
          {current.next && (
            <Button size="lg" variant="primary" onClick={() => setToast(`Upgrade to ${current.next} opens here`, "info")}>
              Upgrade to {current.next}
            </Button>
          )}
        </div>
      </Card>

      <OtherPlans current={current} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The plan's terms: its name, the billing cycle, the price, when it renews and what it's billed to. */
function PlanTerms({ current }: { current: Plan }) {
  return (
    <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4 text-[14px] leading-[1.4]">
      {(
        [
          ["Plan", current.name],
          ["Billing cycle", PLAN.cycle],
          ["Price", `${current.price} ${PLAN.cycle === "Monthly" ? "per month" : "per year"}`],
          ["Renews on", planRenewal()],
          ["Billed to", PLAN.billedTo],
        ] as const
      ).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-ink-2">{k}</dt>
          <dd className="font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Every plan this account isn't on, with its price and headline feature: for reading. Upgrade is the one button that moves plan. */
function OtherPlans({ current }: { current: Plan }) {
  return (
    <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-3 p-6 max-sm:p-4">
      <CardHeading>Other plans</CardHeading>
      {PLANS.filter((p) => p.name !== current.name).map((p) => (
        <div key={p.name} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              {p.name} <Chip size="sm">{p.price}</Chip>
            </p>
            <p className="truncate text-[12.5px] text-ink-2">{p.features[0]}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}
