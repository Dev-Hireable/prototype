import type { Section } from "@/lib/portal/nav";

/** The Independent portal's nav: rail + each section's submenu. */
export const SECTIONS: Section[] = [
  {
    href: "/independent",
    label: "Home",
    title: "Home",
    icon: "home",
    menu: [
      { href: "/independent", label: "Dashboard", icon: "dashboard" },
      { href: "/independent/messages", label: "Messages", icon: "messages", bare: true },
    ],
  },
  {
    href: "/independent/jobs",
    label: "Job Board",
    title: "Job Board",
    icon: "logo",
    menu: [
      { href: "/independent/jobs", label: "Discover roles", icon: "search" },
      { href: "/independent/jobs/applications", label: "My applications", icon: "applications" },
      { href: "/independent/jobs/saved", label: "Saved roles", icon: "saved" },
      { href: "/independent/jobs/interviews", label: "Interviews", icon: "interviews" },
    ],
  },
  {
    href: "/independent/contracts",
    label: "Contracts",
    title: "Contracts",
    icon: "contracts",
    menu: [{ href: "/independent/contracts", label: "All Contracts", icon: "document" }],
  },
  {
    href: "/independent/wallet",
    label: "Earnings",
    title: "Earnings",
    icon: "wallet",
    menu: [
      { href: "/independent/wallet", label: "Transaction history", icon: "billing" },
      { href: "/independent/wallet/disputes", label: "Disputes", icon: "disputes" },
    ],
  },
  {
    href: "/independent/settings",
    label: "Settings",
    title: "Settings",
    icon: "settings",
    menu: [
      { href: "/independent/settings", label: "Account", icon: "account" },
      { href: "/independent/settings/security", label: "Security", icon: "security" },
      { href: "/independent/settings/payout", label: "Payout methods", icon: "card" },
      { href: "/independent/settings/notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    href: "/independent/notifications",
    label: "Notifications",
    title: "Notifications",
    icon: "bell",
    menu: [{ href: "/independent/notifications", label: "All notifications", icon: "bell" }],
  },
  {
    href: "/independent/profile",
    label: "Profile",
    title: "Profile",
    icon: "account",
    hidden: true,
    menu: [
      { href: "/independent/profile", label: "My profile", icon: "account" },
      { href: "/login", label: "Log out", icon: "logout", action: "logout" },
    ],
  },
];
