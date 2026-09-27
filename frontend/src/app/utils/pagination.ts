export type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

/**
 * Page buttons to render, always keeping the first and last page and
 * collapsing the rest into ellipses around the current page, e.g.
 *   1 2 3 4 5 … 14   |   1 … 6 7 8 … 14   |   1 … 10 11 12 13 14
 * The item count stays constant (7 with one sibling) so the bar doesn't jump,
 * and an ellipsis always hides at least two pages — never a single one.
 */
export function getPageItems(currentPage: number, totalPages: number, siblingCount = 1): PageItem[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  // first + last + current + siblings + 2 ellipses
  const maxItems = siblingCount * 2 + 5;
  if (totalPages <= maxItems) return range(1, Math.max(totalPages, 0));

  const current = Math.min(Math.max(currentPage, 1), totalPages);
  const left = Math.max(current - siblingCount, 1);
  const right = Math.min(current + siblingCount, totalPages);
  const showStartEllipsis = left > 3;
  const showEndEllipsis = right < totalPages - 2;
  const edgeCount = siblingCount * 2 + 3;

  if (!showStartEllipsis) return [...range(1, edgeCount), 'end-ellipsis', totalPages];
  if (!showEndEllipsis) return [1, 'start-ellipsis', ...range(totalPages - edgeCount + 1, totalPages)];
  return [1, 'start-ellipsis', ...range(left, right), 'end-ellipsis', totalPages];
}
