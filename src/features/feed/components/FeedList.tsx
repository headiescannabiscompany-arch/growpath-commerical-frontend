// src/features/feed/components/FeedList.tsx
import React from "react";
import { FlatList, RefreshControl } from "react-native";
import { FeedItemCard } from "./FeedItemCard";
import { FeedSkeleton } from "./FeedSkeleton";
import { FeedEmptyState } from "./FeedEmptyState";
import type { FeedItem } from "../types/feed";

interface FeedListProps {
  items: FeedItem[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onEndReached: () => void;
  hasMore: boolean;
}

export function FeedList({
  items,
  loading,
  error,
  onRefresh,
  onEndReached,
  hasMore
}: FeedListProps) {
  if (loading && items.length === 0) return <FeedSkeleton />;
  if (!loading && items.length === 0) return <FeedEmptyState />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedItemCard item={item} />}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.5}
    />
  );
}
