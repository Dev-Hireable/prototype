import { InviteModal } from "@/components/team/invite-modal";
import { ProfileDrawer } from "@/components/team/ui";
import type { SetToast } from "@/lib/portal/toast";
import type { Independent } from "@/lib/team/data";

/**
 * What a card opens on Discover and Saved independents: Invite to apply, and the profile preview —
 * whose own Invite closes it and opens the invite for the same person.
 */
export function TalentOverlays({ target, preview, onTarget, onPreview, onToast }: { target: Independent | null; preview: Independent | null; onTarget: (p: Independent | null) => void; onPreview: (p: Independent | null) => void; onToast: SetToast }) {
  return (
    <>
      <InviteModal target={target} onClose={() => onTarget(null)} onSent={(name) => onToast(`Invite sent to ${name}`)} />
      <ProfileDrawer
        person={preview}
        onClose={() => onPreview(null)}
        onInvite={(p) => {
          onPreview(null);
          onTarget(p);
        }}
      />
    </>
  );
}
