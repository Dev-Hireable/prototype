"use client";

import { shortName } from "@/lib/portal/names";
import { useTeamContracts } from "./contracts";

/**
 * Who the Team Builder has hired: the offer is signed, so there's a contract with them. Until then
 * an Independent reads as "Juan D." with no website, LinkedIn or portfolio link, everywhere a Team
 * Builder meets them, so a match can't be looked up or reached off Hireable before a hire.
 */
export function useHired() {
  const { contracts } = useTeamContracts();
  const hired = (slug: string) => contracts.some((c) => c.independent === slug);
  return {
    hired,
    /** The name to show: in full once hired, the first name and the surname's initial before. */
    nameOf: (p: { slug: string; name: string }) => (hired(p.slug) ? p.name : shortName(p.name)),
  };
}
