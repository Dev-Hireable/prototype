"use client";

import { useMemo } from "react";
import { persisted, useStored } from "@/lib/demo/live";
import { traitTagsFor } from "@/lib/demo/work-style";
import { MARKETING_BANNER, ME, profile as seedProfile } from "./data";

/** Everything on the profile screen that the independent can change. */
export type Profile = {
  name: string;
  headline: string;
  bio: string;
  rate: string;
  level: string;
  location: string;
  photo: string;
  skills: string[];
  links: { linkedin: string; portfolio: string; website: string };
  /** IN-067 — account details, edited from Settings and saved with everything else. */
  email: string;
  phone: string;
  timezone: string;
};

const SEED_PROFILE: Profile = {
  name: ME.name,
  headline: ME.headline,
  bio: seedProfile.bio,
  rate: seedProfile.rate,
  level: seedProfile.level,
  location: seedProfile.location,
  photo: seedProfile.photo,
  skills: seedProfile.skills,
  links: seedProfile.links,
  email: "juandelacruz@gmail.com",
  phone: "+63 917 555 0142",
  timezone: "(GMT+8) Manila",
};

/**
 * IN-060 / IN-061 / IN-062 — the profile as Team Builders see it. The edit form used to keep it in
 * page state, so every "Profile saved" was a lie that a reload undid.
 */
const profileStore = persisted<Profile>("ind.profile", SEED_PROFILE);
/** IN-063 / IN-064 — the quiz's answers (@/lib/demo/work-style), and the tags and matches derived from them. */
const workStyleStore = persisted<number[]>("ind.workStyle", []);

const setProfile = (patch: Partial<Profile>) => profileStore.set((p) => ({ ...p, ...patch }));

export function useIndependentAccount() {
  const profile = useStored(profileStore);
  const workStyle = useStored(workStyleStore);
  const tags = useMemo(() => traitTagsFor(workStyle, "independent"), [workStyle]);
  return { profile, setProfile, workStyle, tags };
}

/** The id of the dashboard banner last closed; a new banner shows again. */
const bannerDismissedStore = persisted("ind.bannerDismissed", "");

/** Whether the dashboard's current banner was closed, and closing it. */
export function useIndependentBanner() {
  const dismissed = useStored(bannerDismissedStore) === MARKETING_BANNER.id;
  return { dismissed, dismiss: () => bannerDismissedStore.set(MARKETING_BANNER.id) };
}
