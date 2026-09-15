import type { Tone } from "@/components/admin/ui";

/** Content transcribed from "Admin settings / Accounts" and "Admin settings / Audit logs" in Figma. */

export type AdminAccount = {
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: string;
  tone: Tone;
};

export const adminAccounts: AdminAccount[] = [
  { name: "R. Milano", email: "ramillano@hireable.ph", role: "Owner", lastActive: "11 Sep 2026", status: "Active", tone: "ok" },
  { name: "Rowena Alcantara", email: "rowena@hireable.ph", role: "Operations", lastActive: "11 Sep 2026", status: "Active", tone: "ok" },
  { name: "T. Arnaiz", email: "tutti@hireable.ph", role: "Product", lastActive: "10 Sep 2026", status: "Active", tone: "ok" },
  { name: "Support desk", email: "support@hireable.ph", role: "Support", lastActive: "09 Sep 2026", status: "Active", tone: "ok" },
  { name: "K. Tobias", email: "kayl@hireable.ph", role: "Support", lastActive: "14 Jun 2026", status: "Suspended", tone: "danger" },
];

export type AuditEntry = { action: string; admin: string; target: string; when: string };

export const auditLog: AuditEntry[] = [
  { action: "Released escrow manually", admin: "R. Milano", target: "TRX-2026-0912", when: "02 Sep 2026, 11:04" },
  { action: "Suspended account", admin: "R. Milano", target: "Kestrel Labs", when: "19 Aug 2026, 15:22" },
  { action: "Approved ID verification", admin: "R. Milano", target: "Juan Dela Cruz", when: "09 Aug 2026, 07:40" },
  { action: "Rejected role", admin: "T. Arnaiz", target: "Account Executive — Vela Partners", when: "18 Aug 2026, 09:15" },
  { action: "Changed admin role", admin: "R. Milano", target: "K. Tobias → Support", when: "14 Jun 2026, 10:02" },
];
