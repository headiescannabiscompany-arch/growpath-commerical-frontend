import React, { useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, Switch } from "react-native";
import { useWebhooks } from "../../hooks/useWebhooks";
import type { NotificationType } from "../../types/notification";

const EVENT_OPTIONS: { label: string; value: NotificationType }[] = [
  { label: "Task Assigned", value: "TASK_ASSIGNED" },
  { label: "Task Overdue", value: "TASK_OVERDUE" },
  { label: "Compliance Required", value: "COMPLIANCE_REQUIRED" },
  { label: "Compliance Missed", value: "COMPLIANCE_MISSED" },
  { label: "Automation Triggered", value: "AUTOMATION_TRIGGERED" },
  { label: "Team Invite", value: "TEAM_INVITE" }
];

export default function WebhooksScreen() {
  const { data, isLoading, createWebhook, updateWebhook, deleteWebhook } = useWebhooks();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<NotificationType[]>([]);

  const webhooks = Array.isArray(data) ? data : [];

  const submit = async () => {
    if (!url.trim() || events.length === 0) return;
    await createWebhook({ url, events, enabled: true });
    setUrl("");
    setEvents([]);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Webhooks</Text>
      <Text style={{ opacity: 0.75, marginBottom: 16 }}>
        Send GrowPath events to any external system in real time.
      </Text>

      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="Webhook URL"
        style={{ borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 }}
      />
      <Text style={{ marginBottom: 4 }}>Events:</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {EVENT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() =>
              setEvents((evs) =>
                evs.includes(opt.value)
                  ? evs.filter((e) => e !== opt.value)
                  : [...evs, opt.value]
              )
            }
            style={{
              padding: 8,
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: events.includes(opt.value) ? "#e0f7fa" : undefined
            }}
          >
            <Text>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={submit}
        style={{ padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 16 }}
      >
        <Text>Add Webhook</Text>
      </Pressable>

      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={webhooks}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}
            >
              <Text style={{ fontWeight: "700" }}>{item.url}</Text>
              <Text style={{ marginTop: 4 }}>Events: {item.events.join(", ")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Text>Enabled</Text>
                <Switch
                  value={item.enabled}
                  onValueChange={(val) => {
                    void updateWebhook(item.id, { enabled: val });
                  }}
                />
                <Pressable
                  onPress={() => {
                    void deleteWebhook(item.id);
                  }}
                  style={{ marginLeft: 16 }}
                >
                  <Text style={{ color: "red" }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
