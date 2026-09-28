"use client";

import { useEffect, useState } from "react";

const clockNow = () => Date.now();

/** Now, ticking on an interval, so a countdown ("2 days left") stays true while the page is open. */
export function useNow(every = 30_000) {
  const [now, setNow] = useState(clockNow);
  useEffect(() => {
    const t = setInterval(() => setNow(clockNow()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}
