import type { Section } from "@/lib/portal/nav";

/** The Admin portal's nav sections. */
export const SECTIONS: Section[] = [
  {
    href: "/admin",
    label: "Home",
    title: "Home",
    icon: "home",
    menu: [
      { href: "/admin", label: "Admin dashboard", icon: "dashboard" },
      { href: "/admin/platform-stats", label: "Platform stats", icon: "chart" },
    ],
  },
  {
    href: "/admin/users",
    label: "User mgmt",
    title: "User management",
    icon: "users",
    menu: [
      { href: "/admin/users", label: "Team builder accounts", icon: "business" },
      { href: "/admin/users/independents", label: "Independent accounts", icon: "person" },
    ],
  },
  {
    href: "/admin/roles",
    label: "Roles",
    title: "Roles",
    icon: "roles",
    menu: [{ href: "/admin/roles", label: "All roles", icon: "roles" }],
  },
  {
    href: "/admin/disputes",
    label: "Disputes",
    title: "Disputes",
    icon: "disputes",
    // A contract's work is opened from a dispute (AD-050), so it reads as part of this section.
    match: ["/admin/contracts"],
    menu: [{ href: "/admin/disputes", label: "All disputes", icon: "disputes", match: ["/admin/contracts"] }],
  },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    title: "Subscriptions",
    icon: "subscriptions",
    menu: [{ href: "/admin/subscriptions", label: "All subscriptions", icon: "subscriptions" }],
  },
  {
    href: "/admin/billing",
    label: "Billing",
    title: "Billing",
    icon: "billing",
    menu: [{ href: "/admin/billing", label: "All transactions", icon: "billing" }],
  },
  {
    href: "/admin/content",
    label: "Content",
    title: "Content",
    icon: "content",
    menu: [{ href: "/admin/content", label: "Marketing banners", icon: "content" }],
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    title: "Marketing",
    icon: "marketing",
    menu: [{ href: "/admin/marketing", label: "Growth & revenue", icon: "marketing" }],
  },
  {
    href: "/admin/settings",
    label: "Admin settings",
    title: "Admin settings",
    icon: "settings",
    menu: [
      { href: "/admin/settings", label: "Admin accounts", icon: "edit" },
      { href: "/admin/settings/audit-logs", label: "Audit logs", icon: "history" },
    ],
  },
  {
    href: "/admin/profile",
    label: "Profile",
    title: "Profile",
    icon: "account",
    hidden: true,
    menu: [
      { href: "/admin/profile", label: "My profile", icon: "account" },
      { href: "/login", label: "Log out", icon: "logout", action: "logout" },
    ],
  },
];

