/**
 * Money typed into a field, formatted as it's typed — the create-role wizard's budget and benefits,
 * and the rate on the Team Builder's edit of a sent offer.
 */

/** Live money formatting: digits only, thousands commas, one dot, at most two decimals ("1500.5" → "1,500.5"). */
export function formatMoney(raw: string) {
  const clean = raw.replace(/[^0-9.]/g, "");
  const dot = clean.indexOf(".");
  const int = (dot < 0 ? clean : clean.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const dec = dot < 0 ? null : clean.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec === null ? grouped : `${grouped || "0"}.${dec}`;
}

/** On blur, settle to two decimals ("1,500" → "1,500.00"); an empty field stays empty. */
export function settleMoney(v: string) {
  if (!v) return "";
  const [int, dec = ""] = formatMoney(v).split(".");
  return `${int || "0"}.${dec.padEnd(2, "0")}`;
}
