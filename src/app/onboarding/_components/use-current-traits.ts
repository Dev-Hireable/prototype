'use client';

import { useEffect, useState } from 'react';

import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import {
  sideOfQuizRole,
  storedWorkStyle,
  traitTagsFor,
  type WorkStyleTag,
} from '@/lib/demo/work-style';

/**
 * The traits this side already has: none on a first run, so the welcome celebrates the new
 * account, and the current set on a retake, so it welcomes them back and shows what the quiz is
 * about to replace.
 *
 * Read once when the onboarding opens, not live: the quiz saves over them at the end, and the
 * welcome and greeting mustn't change their minds then. The answers are kept in this browser, so
 * they can only be read after hydration; the splash covers the intro until well after that.
 */
export function useCurrentTraits(role: PublicSignupRole): WorkStyleTag[] {
  const [traits, setTraits] = useState<WorkStyleTag[]>([]);

  useEffect(() => {
    const side = sideOfQuizRole(role);
    // oxlint-disable-next-line react/set-state-in-effect
    setTraits(traitTagsFor(storedWorkStyle(side), side));
  }, [role]);

  return traits;
}
