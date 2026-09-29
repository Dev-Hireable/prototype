import type { Tone } from "@/lib/portal/tone";

export type AdminAccount = {
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: string;
  tone: Tone;
};

export const adminAccounts: AdminAccount[] = [
  { name: "Admin Lead", email: "admin@hireable.ph", role: "Owner", lastActive: "11 Sep 2026", status: "Active", tone: "ok" },
  { name: "Ops Manager", email: "ops@hireable.ph", role: "Operations", lastActive: "11 Sep 2026", status: "Active", tone: "ok" },
  { name: "Product Lead", email: "product@hireable.ph", role: "Product", lastActive: "10 Sep 2026", status: "Active", tone: "ok" },
  { name: "Support desk", email: "support@hireable.ph", role: "Support", lastActive: "09 Sep 2026", status: "Active", tone: "ok" },
  { name: "Support Agent", email: "agent@hireable.ph", role: "Support", lastActive: "14 Jun 2026", status: "Suspended", tone: "danger" },
];

export type AuditEntry = { action: string; admin: string; target: string; when: string };

export const auditLog: AuditEntry[] = [
  { action: "Released escrow manually", admin: "Admin Lead", target: "TRX-2026-0912", when: "02 Sep 2026, 11:04" },
  { action: "Suspended account", admin: "Admin Lead", target: "Kestrel Labs", when: "19 Aug 2026, 15:22" },
  { action: "Approved ID verification", admin: "Admin Lead", target: "Juan Dela Cruz", when: "09 Aug 2026, 07:40" },
  { action: "Rejected role", admin: "Product Lead", target: "Account Executive — Vela Partners", when: "18 Aug 2026, 09:15" },
  { action: "Changed admin role", admin: "Admin Lead", target: "Support Agent → Support", when: "14 Jun 2026, 10:02" },
];
