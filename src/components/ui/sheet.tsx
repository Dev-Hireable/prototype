"use client"

import * as React from "react"
// Hireable: built on Base UI's Drawer rather than its Dialog, so every sheet can be swiped away —
// the way it slides out, or down on a phone. Same parts and props as shadcn's Sheet otherwise.
import { Drawer as SheetPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
// Hireable: the app's Material icon set rather than Lucide.
import { ICONS } from "@/components/icons"
import { PHONE, useMedia } from "@/lib/portal/media"

type Side = "top" | "right" | "bottom" | "left"

const SWIPE = { top: "up", right: "right", bottom: "down", left: "left" } as const

const SideContext = React.createContext<Side>("right")

/**
 * Hireable: the side is set on the root (it decides which way a swipe dismisses), and on a phone a
 * side sheet comes up from the bottom edge instead — a full-width sheet the thumb can drag down.
 */
function Sheet({ side = "right", ...props }: SheetPrimitive.Root.Props & { side?: Side }) {
  const phone = useMedia(PHONE)
  const shown: Side = phone && (side === "left" || side === "right") ? "bottom" : side
  return (
    <SideContext.Provider value={shown}>
      <SheetPrimitive.Root data-slot="sheet" swipeDirection={SWIPE[shown]} {...props} />
    </SideContext.Provider>
  )
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        // Fades with the swipe: the further the sheet is dragged, the lighter the page behind it.
        "fixed inset-0 z-50 bg-black/10 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/*
 * Each side: where it sits, how it follows the finger, and where it slides in from and out to. The
 * popup's motion is Base UI's reference drawer's: will-change: transform and a 450ms ease-out (400ms
 * out, quicker after a flick). On its own layer the slide runs on the compositor and starts from the
 * first frame the sheet is drawn; at 300ms off the main thread, the first open — when the sheet's
 * contents are drawn for the first time — had most of its slide over before anything showed.
 */
const SIDE: Record<Side, string> = {
  right:
    "inset-y-0 right-0 h-[calc(100dvh/var(--ui-scale))] w-3/4 border-l sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x,0px))] data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]",
  left:
    "inset-y-0 left-0 h-[calc(100dvh/var(--ui-scale))] w-3/4 border-r sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x,0px))] data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)]",
  bottom:
    // No blurred shadow: over the dimmed page it hardly showed, and drawing it took the first open
    // ~60ms — long enough to swallow most of the slide. A 1px edge marks the top instead.
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(0,0,0,0.08)] [transform:translateY(var(--drawer-swipe-movement-y,0px))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
  top: "inset-x-0 top-0 border-b [transform:translateY(var(--drawer-swipe-movement-y,0px))] data-ending-style:[transform:translateY(-100%)] data-starting-style:[transform:translateY(-100%)]",
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const side = React.useContext(SideContext)
  return (
    <SheetPortal>
      <SheetOverlay />
      {/* Hireable: the viewport is what follows the finger (Base UI's swipe-to-dismiss lives there). */}
      <SheetPrimitive.Viewport data-slot="sheet-viewport" className="fixed inset-0 z-50">
        <SheetPrimitive.Popup
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            "ui-zoom fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg outline-none will-change-transform transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]",
            SIDE[side],
            className
          )}
          {...props}
        >
          {/* Hireable: a bottom sheet shows it can be dragged — a grab bar centred on its top edge. */}
          {side === "bottom" && <div aria-hidden className="mx-auto mt-2 -mb-2 h-1 w-10 shrink-0 rounded-full bg-[#c3c3c3]" />}
          {/* contents: the parts keep laying out as the popup's own children (a header, a scrolling body). */}
          <SheetPrimitive.Content className="contents">{children}</SheetPrimitive.Content>
          {showCloseButton && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-3 right-3"
                  size="icon-sm"
                />
              }
            >
              {/* Hireable: ICONS.close in place of Lucide's XIcon. */}
              <ICONS.close aria-hidden />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPortal>
  )
}

/** Hireable: which side the open sheet is showing on — "bottom" for a side sheet on a phone. */
function useSheetSide() {
  return React.useContext(SideContext)
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  useSheetSide,
}
