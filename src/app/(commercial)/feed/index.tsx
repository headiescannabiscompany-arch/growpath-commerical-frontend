import React, { useCallback, useState, useEffect } from "react";
import { View, FlatList, RefreshControl, Text } from "react-native";
import { useCommercialFeed } from "../../../features/feed/hooks/useCommercialFeed";
import { FeedItemCard } from "../../../features/feed/components/FeedItemCard";
import { FeedFiltersBar } from "../../../features/feed/components/FeedFiltersBar";

// Dev sanity toggle: use demo-facility if none selected
const getFacilityId = () => {
  // TODO: Replace with real facility selection logic
  if (__DEV__) return "demo-facility";
  return "facility-1";
};

  const [selectedType, setSelectedType] = useState("all");
  const [status, setStatus] = useState("");
  const facilityId = getFacilityId();
  const filters = {
    type: selectedType !== "all" ? selectedType : undefined,
    status: status || undefined
  };
  const {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
    hasNextPage,
    error
  } = useCommercialFeed({ facilityId, filters });

  // Contract validator (dev only)
  useEffect(() => {
    if (!__DEV__) return;
    for (const item of items) {
      if (!item.id || !item.type || !item.status || !item.scope?.facilityId || !item.createdAt) {
        // eslint-disable-next-line no-console
        console.error("FeedItem contract violation", item);
        throw new Error("FeedItem contract violation");
      }
      if (isNaN(Date.parse(item.createdAt))) {
        // eslint-disable-next-line no-console
        console.error("FeedItem createdAt invalid date", item.createdAt);
        throw new Error("FeedItem createdAt invalid date");
      }
      const key = `${item.type}:${item.id}`;
      if (!key || !key.match(/^[a-z]+:[\w-]+$/)) {
        // eslint-disable-next-line no-console
        console.error("FeedItem key format violation", key);
        throw new Error("FeedItem key format violation");
      }
    }
  }, [items]);

  const keyExtractor = useCallback((item) => `${item.type}:${item.id}`, []);
  const renderItem = useCallback(({ item }) => <FeedItemCard item={item} />, []);
  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  // Fail loud: if commercial mode and no facilityId, show locked state
  if (!facilityId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#888', textAlign: 'center' }}>
          Commercial feed is locked. Select a facility to continue.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FeedFiltersBar
        selectedType={selectedType}
        onSelectType={setSelectedType}
        status={status}
        onSelectStatus={setStatus}
      />
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={{ textAlign: "center", marginTop: 32 }}>
              {selectedType !== "all" || status
                ? `No items for these filters.`
                : "No feed items right now."}
            </Text>
          )
        }
      />
      {/* TODO: Error state, loading spinner, etc. */}
    </View>
  );
}
