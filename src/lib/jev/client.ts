import "server-only";

import { TypeSafeClient } from "@typesafe-ai/sdk";

/**
 * Jev is TypeSafe's System One model: it reads a state and answers typed questions (choice, score,
 * noul) with probabilities instead of generated text (https://docs.typesafe.ai). The key sits in
 * .env.local as TYPESAFE_API_KEY and must never reach the browser, so this module is server-only: a
 * client component asks through a server action or route handler that imports it.
 *
 * Nothing trains Jev on Hireable — every account shares the same weights. All it knows about the app
 * is what a call sends, so build each question's state and criteria from the sources the UI already
 * reads (the quiz script, a job post, a profile) and its answers follow the app as it changes.
 */

let client: TypeSafeClient | undefined;

/** Whether a key is set. Without one (a fresh clone, the e2e build) callers keep their non-AI path. */
export const jevConfigured = () => Boolean(process.env.TYPESAFE_API_KEY?.trim());

/** The shared client, made on first use: the SDK throws on construction when the key is missing. */
export function jev(): TypeSafeClient {
  client ??= new TypeSafeClient();
  return client;
}
