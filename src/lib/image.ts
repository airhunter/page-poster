export function isLikelyTitleCardImage(imageUrl: string, title: string): boolean {
  let path = "";
  try {
    path = decodeURIComponent(new URL(imageUrl).pathname).toLowerCase();
  } catch {
    return false;
  }

  const tokens = title
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length >= 4) ?? [];
  if (!tokens.length) return false;

  const matches = tokens.filter((token) => path.includes(token));
  return matches.length >= 2 || (tokens.length === 1 && tokens[0]!.length >= 6 && matches.length === 1);
}
