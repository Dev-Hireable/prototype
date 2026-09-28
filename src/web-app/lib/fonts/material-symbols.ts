import localFont from 'next/font/local';

/**
 * Subset of Material Symbols holding only the glyphs the app renders, built by
 * `npm run icons:subset`. The upstream font is 3.7 MB; this is under 50 KB.
 *
 * The font is bound through this generated class rather than a global
 * `.material-symbols-outlined` rule: an author rule in `globals.css` does not
 * survive the Tailwind pipeline, and the class carries its own `@font-face`
 * so there is no CSS-variable indirection to get wrong.
 *
 * `display: block` keeps the codepoint from flashing as a tofu box before the
 * font arrives.
 */
export const materialSymbolsFont = localFont({
  src: './material-symbols-subset.woff2',
  weight: '100 700',
  style: 'normal',
  display: 'block',
});
