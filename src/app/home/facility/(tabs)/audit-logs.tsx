import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform
} from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type AuditLogItem = {
  _id: string;
  entity?: string;
  entityId?: string;
  action?: string;
  actorName?: string;
  createdAt?: string;
  summary?: string;
};

const entityLabels: Record<string, string> = {
  inventory: "Inventory",
  deviation: "Deviation",
  greenWaste: "Green Waste",
  sop: "SOP",
  verification: "Verification",
  task: "Task",
  audit: "Audit"
  // ...add more as needed
};

function unique<T>(arr: (T | undefined | null)[]): T[] {
  return Array.from(new Set(arr.filter(Boolean) as T[]));
}

export default function FacilityAuditLogScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Filter state
  const [entity, setEntity] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [actor, setActor] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(endpoints.auditLogs(facilityId));
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setItems(list);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId]);

  // Compute unique filter options
  const entityOptions = useMemo(() => unique(items.map((i) => i.entity)), [items]);
  const actionOptions = useMemo(() => unique(items.map((i) => i.action)), [items]);
  const actorOptions = useMemo(() => unique(items.map((i) => i.actorName)), [items]);

  // Filtered list
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (entity && item.entity !== entity) return false;
      if (action && item.action !== action) return false;
      if (
        actor &&
        (!item.actorName || !item.actorName.toLowerCase().includes(actor.toLowerCase()))
      )
        return false;
      if (dateStart) {
        const d = item.createdAt ? new Date(item.createdAt) : null;
        if (!d || d < new Date(dateStart)) return false;
      }
      if (dateEnd) {
        const d = item.createdAt ? new Date(item.createdAt) : null;
        if (!d || d > new Date(dateEnd)) return false;
      }
      return true;
    });
  }, [items, entity, action, actor, dateStart, dateEnd]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Simple dropdown for filters (native picker for mobile, select for web)
  function FilterDropdown({
    label,
    value,
    options,
    onChange
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) {
    if (Platform.OS === "web") {
      return (
        <View style={{ marginRight: 12, marginBottom: 8 }}>
          <label style={{ fontWeight: 600, marginRight: 4 }}>{label}:</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minWidth: 100 }}
          >
            <option value="">All</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {entityLabels[opt] || opt}
              </option>
            ))}
          </select>
        </View>
      );
    }
    // Native: fallback to TextInput for now
    return (
      <View style={{ marginRight: 12, marginBottom: 8 }}>
        <Text style={{ fontWeight: "600" }}>{label}:</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="All"
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 4,
            padding: 4,
            minWidth: 100
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <InlineError error={error} />

      {/* Filters */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
        <FilterDropdown
          label="Entity"
          value={entity}
          options={entityOptions}
          onChange={setEntity}
        />
        <FilterDropdown
          label="Action"
          value={action}
          options={actionOptions}
          onChange={setAction}
        />
        {/* Actor filter: text input for substring match */}
        <View style={{ marginRight: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: "600" }}>Actor:</Text>
          <TextInput
            value={actor}
            onChangeText={setActor}
            placeholder="All"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 4,
              padding: 4,
              minWidth: 100
            }}
          />
        </View>
        {/* Date range filters */}
        <View style={{ marginRight: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: "600" }}>Start Date:</Text>
          <TextInput
            value={dateStart}
            onChangeText={setDateStart}
            placeholder="YYYY-MM-DD"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 4,
              padding: 4,
              minWidth: 110
            }}
            keyboardType="default"
          />
        </View>
        <View style={{ marginRight: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: "600" }}>End Date:</Text>
          <TextInput
            value={dateEnd}
            onChangeText={setDateEnd}
            placeholder="YYYY-MM-DD"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 4,
              padding: 4,
              minWidth: 110
            }}
            keyboardType="default"
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Text>No audit activity found</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i._id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                item.entity && item.entityId
                  ? navigation.navigate("AuditEntityTimeline", {
                      entity: item.entity,
                      entityId: item.entityId
                    })
                  : null
              }
            >
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ fontWeight: "600" }}>
                  {item.action || "action"} ·{" "}
                  {entityLabels[item.entity || ""] || item.entity || "entity"}
                </Text>
                <Text style={{ opacity: 0.7 }}>
                  {item.actorName || "System"} ·{" "}
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </Text>
                {item.summary && <Text style={{ marginTop: 4 }}>{item.summary}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
