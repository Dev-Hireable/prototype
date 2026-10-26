/**
 * A company's initials on its colour, in place of a logo: on a role's company card, on an
 * application's Team Builder card and on the company profile until a logo is uploaded. `className`
 * sets the size, the corners and the type size, which differ by where it sits.
 */
export function CompanyMark({ initials, className = "size-12 rounded-lg text-[18px]" }: { initials: string; className?: string }) {
  return <span className={`flex shrink-0 items-center justify-center bg-[#5b5bd6] leading-none font-semibold text-white ${className}`}>{initials}</span>;
}
