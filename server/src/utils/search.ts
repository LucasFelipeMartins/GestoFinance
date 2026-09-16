/**
 * Turns free text from a search box into a safe case-insensitive regex: every
 * metacharacter is escaped, so "(" or "a+" match literally instead of
 * breaking the query (or, with a crafted pattern, tying up the database).
 */
export function searchRegex(term: string): RegExp {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}
