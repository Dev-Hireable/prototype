import { z } from 'zod';

import { MATERIAL_SYMBOL_CODEPOINTS } from './material-symbols.generated';

/**
 * The exact glyphs shipped in `lib/fonts/material-symbols-subset.woff2`.
 *
 * The full Material Symbols font is 3.7 MB; only these are subset into the
 * bundle, so naming a glyph outside this set would render an empty box in
 * production. The generated map is therefore the single source of truth:
 * `Icon` accepts only these names, and `results-content.json` is validated
 * against them at module load.
 *
 * To add an icon: add it to `material-symbol-names.json`, then run
 * `npm run icons:subset`.
 */
export type MaterialSymbolName = keyof typeof MATERIAL_SYMBOL_CODEPOINTS;

const MATERIAL_SYMBOL_NAME_SET: ReadonlySet<string> = new Set(
  Object.keys(MATERIAL_SYMBOL_CODEPOINTS),
);

function isMaterialSymbolName(value: string): value is MaterialSymbolName {
  return MATERIAL_SYMBOL_NAME_SET.has(value);
}

/** Schema for content files that reference an icon by name. */
export const materialSymbolNameSchema = z
  .string()
  .refine(isMaterialSymbolName, {
    error: (issue) =>
      `Unknown Material Symbol "${String(issue.input)}". Add it to lib/icons/material-symbol-names.json and re-run "npm run icons:subset".`,
  });

/**
 * The subset is built by codepoint rather than by ligature, because subsetting
 * by ligature name keeps every icon in the font. Rendering therefore goes
 * through the generated map instead of writing the name as text.
 */
export function getMaterialSymbolGlyph(name: MaterialSymbolName): string {
  return String.fromCodePoint(
    Number.parseInt(MATERIAL_SYMBOL_CODEPOINTS[name], 16),
  );
}
