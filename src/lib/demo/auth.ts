"use client";

import { quizPath, quizTaken } from "@/lib/demo/work-style";

/**
 * OB-001 to OB-004 — the demo's account layer: who is signed in, which accounts exist, and the
 * password-reset links that have been issued.
 *
 * It lives beside @/lib/demo/live because it is the one thing every portal shares. The portal
 * picker on `/` is still the demo's front door; signing in simply sets the session and sends you
 * to the dashboard that matches the account type.
 * ponytail: plaintext passwords in localStorage — it is a prototype with seeded demo accounts, and
 * there is no server to hash against. Swap for a real auth client when one exists.
 */

export type Role = "team" | "independent" | "admin";

export type Account = {
  email: string;
  password: string;
  name: string;
  role: Role;
  /** Company for a Team Builder, job title for an Independent. */
  detail: string;
  /** OB-002 / OB-003 — set once the emailed link is followed; the demo does it on sign-up. */
  verified: boolean;
};

type Session = { email: string; name: string; role: Role } | null;

/** Where each account type lands after signing in (OB-001). */
const HOME: Record<Role, string> = { team: "/team", independent: "/independent", admin: "/admin" };

/**
 * Where signing in actually goes: the dashboard, unless it's a Team Builder or an Independent who
 * hasn't taken the work-style quiz yet. They're greeted by the quiz, which their portal would send
 * them to anyway, and its "View dashboard" brings them on to HOME.
 */
export const landingFor = (role: Role) => (role !== "admin" && !quizTaken(role) ? quizPath(role) : HOME[role]);

/** OB-002 / OB-003 / OB-004 — the same rules the Security settings enforce. */
export const PASSWORD_RULES: readonly [string, (password: string) => boolean][] = [
  ["At least 8 characters", (p) => p.length >= 8],
  ["One uppercase letter", (p) => /[A-Z]/.test(p)],
  ["One number", (p) => /\d/.test(p)],
];

export const passwordOk = (p: string) => PASSWORD_RULES.every(([, test]) => test(p));
export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/** The password every seeded demo account uses. */
export const DEMO_PASSWORD = "Hireable2026!";

const SEED_ACCOUNTS: Account[] = [
  { email: "alex@nairobisolutions.com", password: DEMO_PASSWORD, name: "Alex Rivera", role: "team", detail: "Nairobi Solutions Inc.", verified: true },
  { email: "juandelacruz@gmail.com", password: DEMO_PASSWORD, name: "Juan Dela Cruz", role: "independent", detail: "Sales Manager", verified: true },
  { email: "admin@hireable.com", password: DEMO_PASSWORD, name: "Hireable Admin", role: "admin", detail: "Platform operations", verified: true },
];

type Auth = { session: Session; accounts: Account[] };

const KEY = "hireable.demo.auth";
const SEED: Auth = { session: null, accounts: SEED_ACCOUNTS };

let snapshot: Auth = SEED;
let loaded = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

function parse(raw: string | null): Auth {
  if (!raw) return SEED;
  try {
    const saved = JSON.parse(raw) as Auth;
    // Seeded accounts always exist, whatever an older snapshot held.
    const extra = (saved.accounts ?? []).filter((a) => !SEED_ACCOUNTS.some((s) => s.email === a.email));
    return { session: saved.session ?? null, accounts: [...SEED_ACCOUNTS, ...extra] };
  } catch {
    return SEED;
  }
}

function write(next: Auth) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — the demo still works for this tab */
  }
  emit();
}

/**
 * Read what is on disk before touching the snapshot. Every entry point calls this, not just the
 * hook: a page that only calls signIn or resetPassword (the sign-in and reset screens do exactly
 * that) would otherwise work against the seed and reject accounts and links that really exist.
 */
function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  snapshot = parse(localStorage.getItem(KEY));
}

const findAccount = (email: string) => {
  ensureLoaded();
  return snapshot.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
};

/** OB-001 — returns the account on success, or the message to show under the form. */
export function signIn(email: string, password: string): { account: Account } | { error: string } {
  ensureLoaded();
  const account = findAccount(email);
  if (!account || account.password !== password) return { error: "That email and password don't match an account. Check both and try again." };
  write({ ...snapshot, session: { email: account.email, name: account.name, role: account.role } });
  return { account };
}

/** OB-002 / OB-003 — creating the account and signing straight into it. */
export function signUp(account: Omit<Account, "verified">): { account: Account } | { error: string } {
  ensureLoaded();
  if (findAccount(account.email)) return { error: "An account already uses that email. Sign in instead, or use another address." };
  const created: Account = { ...account, email: account.email.trim(), verified: true };
  write({ ...snapshot, accounts: [...snapshot.accounts, created], session: { email: created.email, name: created.name, role: created.role } });
  return { account: created };
}

export function signOut() {
  ensureLoaded();
  write({ ...snapshot, session: null });
}

/** The accounts the sign-in screen offers, so nobody has to type or paste credentials. */
export const DEMO_ACCOUNTS = SEED_ACCOUNTS.map((a) => ({ email: a.email, name: a.name, label: a.role === "team" ? "Client" : a.role === "independent" ? "Talent" : "Admin" }));

