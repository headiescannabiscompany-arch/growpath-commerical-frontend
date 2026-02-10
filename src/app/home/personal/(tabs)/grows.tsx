import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiRequest } from "@/api/apiRequest";

type GrowListItem = {
  id: string;
  name: string;
  startedAt?: string | null;
};

const GROWS_LIST_PATH = "/api/grows";

function normalizeGrowList(payload: any): GrowListItem[] {
  const raw = payload?.grows ?? payload?.items ?? payload?.data ?? payload;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((g: any) => {
      const id = String(g?.id ?? g?._id ?? g?.growId ?? "");
      if (!id) return null;

      return {
        id,
        name: String(g?.name ?? g?.title ?? "Untitled grow"),
        startedAt: g?.startedAt ?? g?.startDate ?? null
      } as GrowListItem;
    })
    .filter(Boolean) as GrowListItem[];
}

export default function GrowsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ r?: string }>();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<GrowListItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest(GROWS_LIST_PATH, { method: "GET" });
      setItems(normalizeGrowList(res));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load grows.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    // Triggers after returning from create screen (we pass ?r=timestamp)
    load();
  }, [load, params?.r]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goCreate = React.useCallback(() => {
    router.push("/home/personal/grows/new");
  }, [router]);

  const openGrow = React.useCallback(
    (growId: string) => {
      router.push(`/home/personal/grows/${growId}`);
    },
    [router]
  );

  return (
    <View testID="screen-personal-grows" style={{ flex: 1, padding: 16 }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Grows</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Track runs, stages, and progress.
        </Text>
      </View>

      {error ? (
        <View style={{ padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Couldn’t load grows</Text>
          <Text style={{ opacity: 0.8 }}>{error}</Text>
          <TouchableOpacity
            testID="btn-grows-retry"
            onPress={load}
            style={{ marginTop: 10, paddingVertical: 10 }}
          >
            <Text style={{ fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingTop: 24 }}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Create your first grow</Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>
            Start tracking a run so tools and logs have somewhere to attach.
          </Text>

          <TouchableOpacity
            testID="btn-create-first-grow"
            onPress={goCreate}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderRadius: 10,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ fontWeight: "700" }}>+ New grow</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            testID="btn-new-grow"
            onPress={goCreate}
            style={{
              marginBottom: 10,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderRadius: 10,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ fontWeight: "700" }}>+ New grow</Text>
          </TouchableOpacity>

          <FlatList
            data={items}
            keyExtractor={(g) => g.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`grow-row-${item.id}`}
                onPress={() => openGrow(item.id)}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  marginBottom: 10
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
                {item.startedAt ? (
                  <Text style={{ opacity: 0.7, marginTop: 4 }}>
                    Started: {String(item.startedAt)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}
