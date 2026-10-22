import { expect, test } from "@playwright/test";
import { entryDialogOf } from "../../src/lib/portal/entry-dialog";

test.describe("thread entries · what View details opens over the chat", () => {
  test("a proposal or an offer opens in its dialog, on each side", () => {
    expect(entryDialogOf("/team/hire/roles/brand-designer/candidates/deal?proposal=1", "team")).toEqual({ kind: "proposal", slug: "brand-designer" });
    expect(entryDialogOf("/team/hire/roles/brand-designer/candidates/deal?offer=1", "team")).toEqual({ kind: "offer", slug: "brand-designer" });
    expect(entryDialogOf("/independent/jobs/applications/deal?proposal=1", "independent")).toEqual({ kind: "proposal", app: "deal" });
    expect(entryDialogOf("/independent/jobs/applications/deal?offer=1", "independent")).toEqual({ kind: "offer", app: "deal" });
    expect(entryDialogOf("/independent/contracts/brand-designer?offer=open", "independent")).toEqual({ kind: "hire-offer", slug: "brand-designer" });
  });

  test("entries saved with the old offer pages open the same dialogs", () => {
    expect(entryDialogOf("/independent/jobs/applications/deal/offer", "independent")).toEqual({ kind: "offer", app: "deal" });
    expect(entryDialogOf("/independent/contracts/brand-designer/offer", "independent")).toEqual({ kind: "hire-offer", slug: "brand-designer" });
  });

  test("anything else opens its page", () => {
    expect(entryDialogOf("/team/hire/roles/brand-designer/candidates/deal", "team")).toBeNull();
    expect(entryDialogOf("/team/hire/roles/brand-designer", "team")).toBeNull();
    expect(entryDialogOf("/independent/jobs/applications/deal", "independent")).toBeNull();
    expect(entryDialogOf("/independent/contracts/brand-designer?tab=evaluation", "independent")).toBeNull();
    expect(entryDialogOf("/team/payments/disputes/d1", "team")).toBeNull();
  });
});
