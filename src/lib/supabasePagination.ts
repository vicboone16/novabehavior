/**
 * Fetches all rows from a query in batches using `.range()`.
 *
 * Many backend queries cap results at 1000 rows by default; this helper
 * prevents silent truncation.
 */
export async function fetchAllRows<T>(
  queryFactory: (
    from: number,
    to: number
  ) => any,
  batchSize: number = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;

    const page = (data || []) as T[];
    if (page.length === 0) break;

    all.push(...page);
    if (page.length < batchSize) break;
    from += batchSize;
  }

  return all;
}
