import type { Section } from "@/lib/portal/nav";

/** Mirrors "Nav / Team Builder" in the Figma draft: rail + each section's submenu. */
export const SECTIONS: Section[] = [
  {
    href: "/team",
    label: "Home",
    title: "Home",
    icon: "home",
    menu: [
      { href: "/team", label: "Dashboard", icon: "dashboard" },
      { href: "/team/messages", label: "Messages", icon: "messages" },
    ],
  },
  {
    href: "/team/discover",
    label: "Discover",
    title: "Discover",
    icon: "explore",
    menu: [
      { href: "/team/discover", label: "Independents", icon: "search" },
      { href: "/team/discover/saved", label: "Saved Independents", icon: "saved" },
    ],
  },
  {
    href: "/team/hire",
    label: "Hire",
    title: "Hire",
    icon: "logo",
    menu: [
      { href: "/team/hire", label: "Create Role", icon: "edit" },
      { href: "/team/hire/roles", label: "All Roles", icon: "contracts" },
      { href: "/team/hire/offers", label: "Sent Offers", icon: "document" },
      { href: "/team/hire/interviews", label: "Interviews", icon: "interviews" },
    ],
  },
  {
    href: "/team/independents",
    label: "Independents",
    title: "Independents",
    icon: "people",
    menu: [{ href: "/team/independents", label: "All Independents", icon: "people" }],
  },
  {
    href: "/team/payments",
    label: "Payments",
    title: "Payments",
    icon: "payment",
    menu: [
      { href: "/team/payments", label: "Transactions", icon: "billing" },
      { href: "/team/payments/disputes", label: "Disputes", icon: "disputes" },
    ],
  },
  {
    href: "/team/settings",
    label: "Settings",
    title: "Settings",
    icon: "settings",
    menu: [
      { href: "/team/settings", label: "Account", icon: "account" },
      { href: "/team/settings/security", label: "Security", icon: "security" },
      { href: "/team/settings/payment", label: "Payment method", icon: "card" },
      { href: "/team/settings/notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    href: "/team/notifications",
    label: "Notifications",
    title: "Notifications",
    icon: "bell",
    menu: [{ href: "/team/notifications", label: "All notifications", icon: "bell" }],
  },
  {
    href: "/team/profile",
    label: "Profile",
    title: "Profile",
    icon: "account",
    hidden: true,
    menu: [
      { href: "/team/profile", label: "Personal profile", icon: "person" },
      { href: "/team/profile/company", label: "Company profile", icon: "business" },
    ],
  },
];
