import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from "react-native";

// Swap this with your real axios client later
// import client from "../api/client";

const mockFetchCampaigns = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [
    {
      id: "cmp_1",
      title: "GrowPath App Drop Live",
      status: "ACTIVE",
      startsAt: "2026-02-05",
      endsAt: "2026-02-12",
      channel: "Facebook",
      objective: "Recruit beta testers during a live demo",
      budget: 0
    },
    {
      id: "cmp_2",
      title: "Creator Course Launch: LAWNS Fundamentals",
      status: "DRAFT",
      startsAt: "2026-02-15",
      endsAt: "2026-02-22",
      channel: "In-app",
      objective: "Drive enrollments + collect reviews",
      budget: 50
    },
    {
      id: "cmp_3",
      title: "Facilities Pilot Outreach",
      status: "PAUSED",
      startsAt: "2026-03-01",
      endsAt: "2026-03-30",
      channel: "Email",
      objective: "Book 5 facility onboarding calls",
      budget: 0
    }
  ];
};

function StatusPill({ status }) {
  const bg =
    status === "ACTIVE"
      ? "#E8FFF1"
      : status === "DRAFT"
        ? "#EEF4FF"
        : status === "PAUSED"
          ? "#FFF6E5"
          : "#F2F2F2";

  const fg =
    status === "ACTIVE"
      ? "#1A7F37"
      : status === "DRAFT"
        ? "#1E4DB7"
        : status === "PAUSED"
          ? "#9A6A00"
          : "#444";

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{status}</Text>
    </View>
  );
}

function FilterButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? "#111827" : "#E5E7EB",
        marginRight: 8
      }}
    >
      <Text style={{ color: active ? "white" : "#111827", fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyState({ onCreate }) {
  return (
    <View style={{ paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 6 }}>
        No campaigns yet
      </Text>
      <Text style={{ opacity: 0.7, textAlign: "center", paddingHorizontal: 20 }}>
        Create your first campaign to organize launches, promos, and outreach.
      </Text>

      <TouchableOpacity
        onPress={onCreate}
        style={{
          marginTop: 18,
          backgroundColor: "#111827",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Create Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CampaignsScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await mockFetchCampaigns();
      setItems(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const matchQuery = c.title.toLowerCase().includes(query.toLowerCase());
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [items, query, statusFilter]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading campaigns...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Campaigns</Text>
        <TouchableOpacity
          onPress={() =>
            navigation?.navigate?.("CreateCampaign") ||
            Alert.alert("Create", "Hook this to your create screen")
          }
        >
          <Text style={{ color: "#2563EB", fontWeight: "800" }}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search campaigns..."
        value={query}
        onChangeText={setQuery}
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 10,
          marginBottom: 10
        }}
      />

      {/* Filters */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {["ALL", "ACTIVE", "DRAFT", "PAUSED", "ENDED"].map((s) => (
          <FilterButton
            key={s}
            label={s}
            active={statusFilter === s}
            onPress={() => setStatusFilter(s)}
          />
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            onCreate={() =>
              navigation?.navigate?.("CreateCampaign") ||
              Alert.alert("Create", "Hook this to your create screen")
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation?.navigate?.("CampaignDetail", { id: item.id }) ||
              Alert.alert("Campaign", item.title)
            }
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 10
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800" }}>{item.title}</Text>
              <StatusPill status={item.status} />
            </View>

            <Text style={{ opacity: 0.7, marginBottom: 4 }}>{item.objective}</Text>

            <Text style={{ fontSize: 12, opacity: 0.6 }}>
              {item.channel} • {item.startsAt} → {item.endsAt}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
