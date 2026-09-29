import Link from 'next/link';
import Image from 'next/image';

import { AuthPillarsCorners } from './_components/auth-pillars';
import { getButtonClassName } from '@/web-app/components/ui/button-class-name';
import { getLoginPath } from '@/web-app/lib/auth/auth-routes';

/**
 * The real app's 404. Its page renders per request (`await connection()`) so
 * Next can give its scripts the CSP nonce; the prototype sets no CSP, so this
 * one is prerendered.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
    >
      <AuthPillarsCorners />

      <section className="z-10 flex max-w-xl flex-col items-center gap-6 text-center">
        <Image
          src="/Logo.svg"
          alt="Hireable"
          width={56}
          height={56}
          preload
          draggable={false}
          unoptimized
        />
        <h1 className="text-client text-7xl leading-none font-semibold sm:text-8xl">
          404
        </h1>
        <p className="text-foreground text-xl font-semibold">Page not found</p>
        <p className="text-muted-foreground text-sm sm:text-base">
          The page you are looking for does not exist or has moved.
        </p>
        <Link href={getLoginPath()} className={getButtonClassName()}>
          Back to login
        </Link>
      </section>
    </main>
  );
}
