import React, { useMemo, useState, useEffect } from "react";
import { logEvent } from "../../src/api/events";
useEffect(() => {
  logEvent("FEED_VIEW");
}, []);
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  Text,
  Pressable
} from "react-native";
import { useRouter } from "expo-router";

// If you have a RequirePlan component, import it. Otherwise, use your existing plan guard.
// import RequirePlan from "../../src/auth/RequirePlan";
import { FeedFiltersBar } from "../../src/features/feed/components/FeedFiltersBar";
// import CommercialFeedCard from "../../src/components/commercial/CommercialFeedCard";
import { useCommercialFeed } from "../../src/features/feed/hooks/useCommercialFeed";

export default function FeedScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    type: null,
    tag: null,
    query: null,
    sort: "new" as const
  });
  const [myPosts, setMyPosts] = useState(false);

  const params = useMemo(
    () => ({
      type: filters.type || undefined,
      tag: filters.tag || undefined,
      q: filters.query || undefined,
      sort: filters.sort || undefined,
      author: myPosts ? "me" : undefined
    }),
    [filters, myPosts]
  );

  const { items, loading, refreshing, error, hasMore, loadMore, refresh } =
    useCommercialFeed(params);

  return (
    // <RequirePlan allow={["commercial", "facility"]}>
    <View style={{ flex: 1 }}>
      <FeedFiltersBar
        selectedType={filters.type || "all"}
        onSelectType={(type) => setFilters((f) => ({ ...f, type }))}
        myPosts={myPosts}
        onToggleMyPosts={setMyPosts}
      />

      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable
          onPress={() => router.push("/(app)/new-post")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1
          }}
        >
          <Text style={{ fontSize: 16 }}>Create a post…</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={{ padding: 12 }}>
          <Text style={{ marginBottom: 8 }}>Could not load feed.</Text>
          <Text style={{ opacity: 0.7 }}>{String((error as any)?.message || error)}</Text>
          <Pressable
            onPress={refresh}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              alignSelf: "flex-start",
              paddingHorizontal: 12
            }}
          >
            <Text>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id || item._id}
        // renderItem={({ item }) => <CommercialFeedCard post={item} />}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#eee" }}>
            <Text style={{ fontWeight: "bold" }}>{item.title || item.type}</Text>
            <Text style={{ color: "#888" }}>{item.createdAt}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && hasMore) loadMore();
        }}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : !hasMore && items.length > 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ opacity: 0.6 }}>No more posts</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && !refreshing ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ fontSize: 16, opacity: 0.7 }}>No posts yet.</Text>
            </View>
          ) : null
        }
      />
    </View>
    // </RequirePlan>
  );
}
