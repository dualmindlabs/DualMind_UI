/**
 * The model picker's two groups, with the leaderboard's rule (features/leaderboard,
 * PROVISIONAL_BATTLES): models with a rank are "rated" and listed by rank; models without one
 * (too few battles, or not on the board yet) are "Not yet rated", listed by name, with no rank
 * or rating next to them, so the picker never claims more than the board does.
 */

export interface GroupableModel {
  modelId: string;
  displayName: string;
  rank: number | null;
  elo: number | null;
}

export interface ModelGroups<T extends GroupableModel> {
  rated: T[];
  unrated: T[];
}

export function groupModelOptions<T extends GroupableModel>(
  options: readonly T[] | undefined,
): ModelGroups<T> {
  const rated: T[] = [];
  const unrated: T[] = [];
  for (const option of options ?? []) {
    if (option.rank === null) unrated.push(option);
    else rated.push(option);
  }
  rated.sort(
    (a, b) =>
      (a.rank ?? 0) - (b.rank ?? 0) ||
      (b.elo ?? 0) - (a.elo ?? 0) ||
      a.displayName.localeCompare(b.displayName, 'en'),
  );
  unrated.sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, 'en') || a.modelId.localeCompare(b.modelId, 'en'),
  );
  return { rated, unrated };
}
