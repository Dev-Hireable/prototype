import type { Tone } from "@/lib/portal/tone";

export type Banner = {
  banner: string;
  audience: string;
  placement: string;
  runsUntil: string;
  status: string;
  tone: Tone;
};

export const banners: Banner[] = [
  {
    banner: "Refer an independent, get $100",
    audience: "Team Builder",
    placement: "Dashboard, top",
    runsUntil: "30 Sep 2026",
    status: "Live",
    tone: "ok",
  },
  {
    banner: "Complete your work style quiz",
    audience: "Independent",
    placement: "Dashboard, top",
    runsUntil: "—",
    status: "Live",
    tone: "ok",
  },
  {
    banner: "Scale plan — 20% off annual",
    audience: "Team Builder",
    placement: "Dashboard, top",
    runsUntil: "15 Oct 2026",
    status: "Scheduled",
    tone: "accent",
  },
  {
    banner: "New: full-time trackers",
    audience: "Both",
    placement: "Dashboard, top",
    runsUntil: "12 Aug 2026",
    status: "Ended",
    tone: "neutral",
  },
  {
    banner: "Payout methods now support Maya",
    audience: "Independent",
    placement: "Wallet, inline",
    runsUntil: "—",
    status: "Draft",
    tone: "neutral",
  },
];
