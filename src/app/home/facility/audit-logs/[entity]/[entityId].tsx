import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type AuditLogItem = {
  _id: string;
  action?: string;
  actorName?: string;
  createdAt?: string;
  summary?: string;
};

export default function AuditEntityTimelineScreen({ route }: any) {
  const { entity, entityId } = route.params;
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    if (!facilityId || !entity || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(
        `${endpoints.auditLogs(facilityId)}?entity=${entity}&entityId=${entityId}`
      );

      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];

      // chronological order (oldest → newest)
      list.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setItems(list);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId, entity, entityId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <InlineError error={error} />

      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        Audit Timeline
      </Text>

      {items.length === 0 ? (
        <Text>No audit history for this item</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i._id)}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontWeight: "600" }}>{item.action || "action"}</Text>
              <Text style={{ opacity: 0.7 }}>
                {item.actorName || "System"} ·{" "}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
              </Text>
              {item.summary && <Text style={{ marginTop: 4 }}>{item.summary}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type AuditLogItem = {
  _id: string;
  action?: string;
  actorName?: string;
  createdAt?: string;
  summary?: string;
};

export default function AuditEntityTimelineScreen({ route }: any) {
  const { entity, entityId } = route.params;
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    if (!facilityId || !entity || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(
        `${endpoints.auditLogs(facilityId)}?entity=${entity}&entityId=${entityId}`
      );

      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];

      // chronological order (oldest → newest)
      list.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setItems(list);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId, entity, entityId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <InlineError error={error} />

      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        Audit Timeline
      </Text>

      {items.length === 0 ? (
        <Text>No audit history for this item</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i._id)}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontWeight: "600" }}>{item.action || "action"}</Text>
              <Text style={{ opacity: 0.7 }}>
                {item.actorName || "System"} ·{" "}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
              </Text>
              {item.summary && <Text style={{ marginTop: 4 }}>{item.summary}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
