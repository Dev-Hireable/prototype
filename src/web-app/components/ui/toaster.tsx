'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast as sonnerToast, Toaster as Sonner } from 'sonner';

import { Icon } from './icon';

const FLASH_TOAST_COOKIE = 'flash_toast';

/** Same glyphs and colour roles as `FormStatusMessage`, so an inline form
 *  status and a toast for the same outcome read identically. */
const TOAST_ICONS = {
  success: <Icon icon="check_circle" size={24} className="text-success" />,
  error: <Icon icon="warning" size={24} className="text-danger" />,
  warning: <Icon icon="warning" size={24} className="text-warning" />,
};

const TOAST_VARIANTS = ['success', 'error', 'warning'] as const;

type ToastVariant = (typeof TOAST_VARIANTS)[number];

function asToastVariant(value: unknown): ToastVariant {
  return TOAST_VARIANTS.includes(value as ToastVariant)
    ? (value as ToastVariant)
    : 'success';
}

/** Reads the one-shot flash cookie written by server actions, then clears it. */
function consumeFlashToastCookie(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((value) => value.startsWith(`${FLASH_TOAST_COOKIE}=`));
  if (!cookie) return null;

  const encodedPayload = cookie.slice(FLASH_TOAST_COOKIE.length + 1);
  document.cookie = `${FLASH_TOAST_COOKIE}=; Max-Age=0; path=/`;
  if (!encodedPayload) return null;

  try {
    return decodeURIComponent(encodedPayload);
  } catch {
    return encodedPayload;
  }
}

export function Toaster() {
  const pathname = usePathname();

  useEffect(() => {
    const raw = consumeFlashToastCookie();
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as {
        variant?: string;
        message?: string;
      };
      if (!payload.message) return;

      sonnerToast[asToastVariant(payload.variant)](payload.message);
    } catch (error) {
      console.warn('Ignoring malformed flash toast cookie', error);
    }
  }, [pathname]);

  return (
    <Sonner
      position="bottom-right"
      className="toaster group"
      icons={TOAST_ICONS}
      toastOptions={{
        classNames: {
          toast:
            'group toast !flex !flex-row !items-center !justify-start [&[data-sonner-toast]]:!items-center [&[data-sonner-toast]]:!min-h-14 [&[data-sonner-toast]]:!py-4 [&[data-sonner-toast]]:!pl-4 [&[data-sonner-toast]]:!pr-6 [&[data-sonner-toast]]:!gap-4 [&[data-sonner-toast]]:!rounded-lg !border !border-border bg-background text-foreground !shadow-lg',
          title:
            '!font-sans !font-medium !text-sm !leading-normal !tracking-normal !m-0 !p-0',
          description:
            '!font-sans !font-normal !text-sm !leading-normal !tracking-normal !m-0 !p-0 !text-muted-foreground',
          actionButton: 'bg-client text-white',
          cancelButton: 'bg-secondary text-secondary-foreground',
          icon: '!h-6 !w-6 !shrink-0 !m-0 !self-center',
          success: '!bg-toast-success-bg !text-foreground !border-success/20',
          error: '!bg-toast-error-bg !text-foreground !border-danger/20',
          warning: '!bg-toast-warning-bg !text-foreground !border-warning/20',
          info: '!bg-toast-info-bg !text-foreground !border-client/20',
          closeButton:
            '!relative !top-auto !right-auto !left-auto !transform-none !bg-transparent !border-none !p-0 !m-0 !ml-auto !shrink-0 !order-last !self-center !text-foreground hover:!text-foreground/80 !transition-colors [&>svg]:!size-5',
        },
      }}
      closeButton
    />
  );
}
