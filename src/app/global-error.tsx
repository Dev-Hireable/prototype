'use client';

import { BRAND_PINK } from '@/web-app/lib/brand-colors';

/**
 * The real app's last-resort page: it catches errors thrown by the root layout,
 * which `app/error.tsx` cannot reach (see `error.js` in the Next docs: it does
 * not wrap the layout above it in the same segment).
 *
 * This file replaces the root layout when active, so it must render its own
 * <html>/<body>, and it gets none of the app's global styles or fonts. Colours
 * come from CSS system keywords so it follows the OS light/dark setting.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1rem',
          textAlign: 'center',
          background: 'Canvas',
          color: 'CanvasText',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <title>Something went wrong | Hireable</title>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
          Hireable could not start. Please try again.
        </p>
        {error.digest ? (
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
            Error ID: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => retry()}
          style={{
            border: 0,
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#fff',
            background: BRAND_PINK,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
