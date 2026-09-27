"use client";

import { Button, Card, Chip, Page, StatusDot, Toast } from "@/components/independent/ui";
import { CardHeading } from "@/components/team/ui";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { PLAN, PLANS } from "@/lib/team/data";

type Plan = (typeof PLANS)[number];

/** TB-101 "View Subscription Plan" — read-only, with the upgrade path as the only action. */
export default function Subscription() {
  const [toast, setToast] = useToast();
  const current = PLANS.find((p) => p.name === PLAN.name) ?? PLANS[0];

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardHeading>Subscription</CardHeading>
            <p className="text-[13px] leading-[1.4] text-ink-2">Your plan covers hiring and escrow across every contract on this account.</p>
          </div>
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

        {/* Read-only otherwise: the only thing you can do from here is move plan. */}
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => setToast("Billing portal opens here", "info")}>
            Manage plan
          </Button>
          {current.next && (
            <Button size="lg" variant="primary" onClick={() => setToast(`Upgrade to ${current.next} opens here`, "info")}>
              Upgrade to {current.next}
            </Button>
          )}
        </div>
      </Card>

      <OtherPlans current={current} onToast={setToast} />
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
          ["Renews on", PLAN.renews],
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

/** Every plan this account isn't on: its price and headline feature, and Switch. */
function OtherPlans({ current, onToast }: { current: Plan; onToast: SetToast }) {
  return (
    <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-3 p-6">
      <CardHeading>Other plans</CardHeading>
      {PLANS.filter((p) => p.name !== current.name).map((p) => (
        <div key={p.name} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              {p.name} <Chip size="sm">{p.price}</Chip>
            </p>
            <p className="truncate text-[12.5px] text-ink-2">{p.features[0]}</p>
          </div>
          <Button size="sm" onClick={() => onToast(`Switch to ${p.name} opens here`, "info")}>
            Switch
          </Button>
        </div>
      ))}
    </Card>
  );
}
