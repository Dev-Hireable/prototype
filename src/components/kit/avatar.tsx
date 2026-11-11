import Image from "next/image";
import Link from "next/link";

export function Initials({ text, className = "size-11 text-[14px]" }: { text: string; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-accent-bg leading-[1.4] font-semibold text-primary ${className}`}>{text}</span>;
}

export function Avatar({ src, size = 40, className = "" }: { src: string; size?: number; className?: string }) {
  return <Image src={src} alt="" width={size * 2} height={size * 2} className={`shrink-0 rounded-full bg-skeleton object-cover object-top ${className}`} style={{ width: size, height: size }} loading="eager" />;
}

/** Table cell "Independent": 40px avatar + name (14 medium primary) + role (13 #616161). */
export function Person({ name, role, avatar, href }: { name: string; role: string; avatar: string; href?: string }) {
  const title = <p className="truncate text-[14px] leading-[1.4] font-medium text-primary">{name}</p>;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar src={avatar} />
      <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
        {href ? <Link href={href} className="hover:underline">{title}</Link> : title}
        <p className="truncate text-[13px] leading-[1.4] text-ink-2">{role}</p>
      </span>
    </span>
  );
}
