"use client";

import { Menu } from "@base-ui/react/menu";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isArchived, refOf, type WorkItem } from "@/lib/work/model";
import { capsFor, transitionFor } from "@/lib/work/permissions";
import { useWorkspace } from "./context";

/**
 * One "⋯" menu per view, shared by every card and row through Base UI's detached triggers — so a
 * board of 600 cards has one menu, not 600. It is also the keyboard's way to do what dragging
 * does: Move to another column, move up or down, to the top or the bottom.
 */

export type MenuMove = { key: string; label: string; icon?: ReactNode; run: () => void };
export type MenuModel = {
  item: WorkItem;
  /** Other columns or groups it can go to. */
  moves?: MenuMove[];
  /** Up, down, top, bottom — only when manual order applies. */
  order?: { up?: () => void; down?: () => void; top?: () => void; bottom?: () => void };
};

export type ItemMenuHandle = ReturnType<typeof Menu.createHandle<string>>;

export function useItemMenuHandle(): ItemMenuHandle {
  const [handle] = useState(() => Menu.createHandle<string>());
  return handle;
}

export function ItemMenuTrigger({ handle, item, className = "" }: { handle: ItemMenuHandle; item: WorkItem; className?: string }) {
  return (
    <DropdownMenuTrigger
      handle={handle}
      payload={item.id}
      aria-label={`More actions for ${refOf(item)} ${item.title}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={`${ICON_BUTTON} size-7 data-popup-open:opacity-100 ${className}`}
    >
      <ICONS.moreH size={18} aria-hidden />
    </DropdownMenuTrigger>
  );
}

export function ItemMenu({ handle, model }: { handle: ItemMenuHandle; model: (id: string) => MenuModel | null }) {
  return (
    <DropdownMenu handle={handle}>
      {({ payload }) => {
        const m = typeof payload === "string" ? model(payload) : null;
        return m && <ItemMenuContent model={m} />;
      }}
    </DropdownMenu>
  );
}

/** The menu for one item: open it, ask for changes, move it to another column or group or within its own, delete or restore it. */
function ItemMenuContent({ model: m }: { model: MenuModel }) {
  const { actor, access, actions, openTask } = useWorkspace();
  const t = m.item;
  const caps = capsFor(t, actor, access);
  const changes = transitionFor(t, actor, access, "doing");
  return (
    <DropdownMenuContent align="end" className="w-60" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuItem onClick={() => openTask(t.id)}>
        <ICONS.northEast size={16} aria-hidden /> Open {refOf(t)}
      </DropdownMenuItem>
      {changes.ok && changes.kind === "requestChanges" && (
        <DropdownMenuItem onClick={() => openTask(t.id, "changes")}>
          <ICONS.undo size={16} aria-hidden /> Request changes…
        </DropdownMenuItem>
      )}
      <MoveToGroup moves={m.moves} />
      <OrderGroup order={m.order} />
      {(caps.archive || caps.restore) && (
        <>
          <DropdownMenuSeparator />
          {isArchived(t) ? (
            <DropdownMenuItem onClick={() => void actions.restore(t)}>
              <ICONS.unarchive size={16} aria-hidden /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" className="text-danger" onClick={() => void actions.archive(t)}>
              <ICONS.trash size={16} aria-hidden /> Delete task
            </DropdownMenuItem>
          )}
        </>
      )}
    </DropdownMenuContent>
  );
}

/** Move to: the other columns or groups the item can go to — nothing when there are none. */
function MoveToGroup({ moves }: { moves: MenuModel["moves"] }) {
  if (!moves?.length) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {moves.map((mv) => (
          <DropdownMenuItem key={mv.key} onClick={mv.run}>
            {mv.icon ?? <ICONS.moveTo size={16} aria-hidden />} {mv.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </>
  );
}

/** Order: up, down, to the top, to the bottom — those there's room for, when manual order applies. */
function OrderGroup({ order: o }: { order: MenuModel["order"] }) {
  if (!(o && (o.up || o.down || o.top || o.bottom))) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        {o.up && (
          <DropdownMenuItem onClick={o.up}>
            <ICONS.arrowUp size={16} aria-hidden /> Move up
          </DropdownMenuItem>
        )}
        {o.down && (
          <DropdownMenuItem onClick={o.down}>
            <ICONS.arrowDown size={16} aria-hidden /> Move down
          </DropdownMenuItem>
        )}
        {o.top && (
          <DropdownMenuItem onClick={o.top}>
            <ICONS.toTop size={16} aria-hidden /> Move to top
          </DropdownMenuItem>
        )}
        {o.bottom && (
          <DropdownMenuItem onClick={o.bottom}>
            <ICONS.toBottom size={16} aria-hidden /> Move to bottom
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
    </>
  );
}
