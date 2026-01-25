// app/(commercial)/feed/index.tsx
import React from "react";
import { View } from "react-native";
import { useAuth } from "../../../src/auth/AuthContext";
import { useCommercialFeed } from "../../../src/features/feed/hooks/useCommercialFeed";
import { useFeedFilters } from "../../../src/features/feed/hooks/useFeedFilters";
import { FeedFiltersBar } from "../../../src/features/feed/components/FeedFiltersBar";
import { FeedList } from "../../../src/features/feed/components/FeedList";

export default function CommercialFeedScreen() {
  const { user } = useAuth();
  // TODO: Replace with actual facilityId selection
  const facilityId = user?.facilityId || "demo-facility";
  const { type, setType, status, setStatus } = useFeedFilters();
  const feed = useCommercialFeed({
    facilityId,
    types: type === "all" ? undefined : type,
    status
  });

  return (
    <View style={{ flex: 1 }}>
      <FeedFiltersBar
        selectedType={type}
        onSelectType={setType}
        status={status}
        onSelectStatus={setStatus}
        types={["all", "task", "alert", "log", "event", "compliance", "note"]}
      />
      <FeedList
        items={feed.items}
        loading={feed.loading}
        error={feed.error}
        onRefresh={feed.refresh}
        onEndReached={feed.fetchMore}
        hasMore={feed.hasMore}
      />
    </View>
  );
}
