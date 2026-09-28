import { useEffect, useState } from "react";

/** How long a timed message stays up. */
const SHOWN_MS = 5000;

/**
 * A message that says its piece for a few seconds, then gets out of the way — why a card can't go
 * to a column, why a bar can't land on a day. Null clears it at once.
 */
export function useTimedMessage() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [message]);
  return [message, setMessage] as const;
}
