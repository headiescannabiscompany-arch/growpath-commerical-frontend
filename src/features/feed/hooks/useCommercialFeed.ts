// src/features/feed/hooks/useCommercialFeed.ts
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnifiedFeed } from "../api/feedAdapter";
import { FeedItem, FeedFilters, FeedPage } from "../types/feed";

// Hardcoded for now; replace with real facilityId source
const DEFAULT_FACILITY_ID = "facility-1";

export interface UseCommercialFeedOptions {
  facilityId?: string;
  filters?: FeedFilters;
  pageSize?: number;
}

export function useCommercialFeed({
  facilityId = DEFAULT_FACILITY_ID,
  filters = {},
  pageSize = 20
}: UseCommercialFeedOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = ["commercialFeed", facilityId, filters];

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
    hasNextPage,
    error
  } = useInfiniteQuery<FeedPage, Error>({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchUnifiedFeed({
        facilityId,
        filters,
        cursor: pageParam as string | undefined,
        limit: pageSize
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined
  });

  // Flatten all items
  const items: FeedItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const isRefreshing = isFetching && !isFetchingNextPage;

  // Optimistic update helpers
  async function optimisticTaskStatus(id: string, status: "done" | "open") {
    // Save previous data for rollback
    const prev = queryClient.getQueryData<any[]>(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedPage) => ({
          ...page,
          items: page.items.map((item: FeedItem) =>
            item.type === "task" && item.id === id ? { ...item, status } : item
          )
        }))
      };
    });
    try {
      const { patchTask } = await import("../api/feedApi");
      await patchTask(id, { status });
    } catch (e) {
      // Rollback
      queryClient.setQueryData(queryKey, prev);
      throw e;
    }
  }

  async function optimisticAlertStatus(id: string, status: "ack" | "closed") {
    const prev = queryClient.getQueryData<any[]>(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedPage) => ({
          ...page,
          items: page.items.map((item: FeedItem) =>
            item.type === "alert" && item.id === id ? { ...item, status } : item
          )
        }))
      };
    });
    try {
      const { patchAlert } = await import("../api/feedApi");
      await patchAlert(id, { status });
    } catch (e) {
      queryClient.setQueryData(queryKey, prev);
      throw e;
    }
  }

  return {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
    hasNextPage,
    error,
    queryClient, // for optimistic updates
    queryKey,
    optimisticTaskStatus,
    optimisticAlertStatus
  };
}
