export function shouldAutoFetchMore({
  filteredCount,
  lastFilteredCount,
  pageSize,
  hasNextPage,
  isFetching
}) {
  const nextLastCount = filteredCount;

  if (filteredCount >= pageSize) {
    return { shouldFetch: false, nextLastCount };
  }

  if (!hasNextPage || isFetching) {
    return { shouldFetch: false, nextLastCount };
  }

  if (filteredCount <= lastFilteredCount) {
    return { shouldFetch: false, nextLastCount };
  }

  return { shouldFetch: true, nextLastCount };
}
