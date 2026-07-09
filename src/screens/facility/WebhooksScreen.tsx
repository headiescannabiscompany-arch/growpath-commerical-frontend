import React, { useState } from "react";
import { Alert, View, Text, FlatList, TextInput, Pressable, Switch } from "react-native";
import { useWebhooks } from "../../hooks/useWebhooks";
import type { NotificationType } from "../../types/notification";
import type { WebhookDelivery } from "../../api/webhooks";
import { radius } from "../../theme/theme";

const EVENT_OPTIONS: { label: string; value: NotificationType }[] = [
  { label: "Task Assigned", value: "TASK_ASSIGNED" },
  { label: "Task Overdue", value: "TASK_OVERDUE" },
  { label: "Compliance Required", value: "COMPLIANCE_REQUIRED" },
  { label: "Compliance Missed", value: "COMPLIANCE_MISSED" },
  { label: "Automation Triggered", value: "AUTOMATION_TRIGGERED" },
  { label: "Team Invite", value: "TEAM_INVITE" }
];

export default function WebhooksScreen() {
  const {
    data,
    isLoading,
    error,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateWebhookSecret,
    testWebhookDelivery,
    loadWebhookDeliveries,
    isSaving
  } = useWebhooks();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<NotificationType[]>([]);
  const [lastSecret, setLastSecret] = useState("");
  const [deliveryRows, setDeliveryRows] = useState<Record<string, WebhookDelivery[]>>({});

  const webhooks = Array.isArray(data) ? data : [];

  const submit = async () => {
    if (!url.trim() || events.length === 0) return;
    const created = await createWebhook({ url, events, enabled: true });
    const secret = created.signingSecret || "";
    if (secret) setLastSecret(secret);
    setUrl("");
    setEvents([]);
  };

  const rotateSecret = async (id: string) => {
    const result = await rotateWebhookSecret(id);
    setLastSecret(result.signingSecret);
    Alert.alert(
      "Signing secret rotated",
      "Copy the new secret now. It will not be shown again."
    );
  };

  const sendTest = async (id: string) => {
    const result = await testWebhookDelivery(id);
    const rows = await loadWebhookDeliveries(id);
    setDeliveryRows((current) => ({ ...current, [id]: rows }));
    const status =
      result.delivery.status === "success" ? "delivered" : result.delivery.status;
    Alert.alert("Test delivery", `Webhook test ${status}.`);
  };

  const loadDeliveries = async (id: string) => {
    const rows = await loadWebhookDeliveries(id);
    setDeliveryRows((current) => ({ ...current, [id]: rows }));
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
        style={{ borderWidth: 1, borderRadius: radius.card, padding: 8, marginBottom: 8 }}
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
              borderRadius: radius.pill,
              backgroundColor: events.includes(opt.value) ? "#e0f7fa" : undefined
            }}
          >
            <Text>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={submit}
        disabled={isSaving || !url.trim() || events.length === 0}
        style={{
          padding: 10,
          borderWidth: 1,
          borderRadius: radius.card,
          marginBottom: 16,
          opacity: isSaving || !url.trim() || events.length === 0 ? 0.5 : 1
        }}
      >
        <Text>{isSaving ? "Saving..." : "Add Webhook"}</Text>
      </Pressable>

      {!!lastSecret && (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#0f766e",
            borderRadius: radius.card,
            padding: 10,
            marginBottom: 12,
            backgroundColor: "#ecfdf5"
          }}
        >
          <Text style={{ fontWeight: "800", marginBottom: 4 }}>New signing secret</Text>
          <Text selectable style={{ fontFamily: "monospace" }}>
            {lastSecret}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.75 }}>
            Save this value now. GrowPath only shows it once.
          </Text>
        </View>
      )}

      {error ? (
        <Text style={{ color: "#b91c1c", marginBottom: 12 }}>
          Unable to load webhooks. Check the backend webhook endpoint.
        </Text>
      ) : isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={webhooks}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text>No webhooks configured yet.</Text>}
          renderItem={({ item }) => (
            <View
              style={{
                borderWidth: 1,
                borderRadius: radius.card,
                padding: 12,
                marginBottom: 10
              }}
            >
              <Text style={{ fontWeight: "700" }}>{item.url}</Text>
              <Text style={{ marginTop: 4 }}>Events: {item.events.join(", ")}</Text>
              <Text style={{ marginTop: 4 }}>
                Secret: {item.secretPreview || "configured"} | Failures:{" "}
                {item.failureCount || 0}
              </Text>
              {!!item.lastDeliveryAt && (
                <Text style={{ marginTop: 4 }}>
                  Last delivery: {String(item.lastDeliveryAt)}
                </Text>
              )}
              {!!item.lastError && (
                <Text style={{ marginTop: 4, color: "#b91c1c" }}>
                  Last error: {item.lastError}
                </Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 8
                }}
              >
                <Text>Enabled</Text>
                <Switch
                  value={item.enabled}
                  onValueChange={(val) => {
                    void updateWebhook(item.id, { enabled: val });
                  }}
                />
                <Pressable
                  onPress={() => {
                    void sendTest(item.id);
                  }}
                  disabled={isSaving}
                >
                  <Text style={{ color: "#0369a1" }}>Test</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void loadDeliveries(item.id);
                  }}
                  disabled={isSaving}
                >
                  <Text style={{ color: "#0369a1" }}>Deliveries</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void rotateSecret(item.id);
                  }}
                  disabled={isSaving}
                >
                  <Text style={{ color: "#854d0e" }}>Rotate Secret</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void deleteWebhook(item.id);
                  }}
                >
                  <Text style={{ color: "red" }}>Delete</Text>
                </Pressable>
              </View>
              {(deliveryRows[item.id] || []).slice(0, 5).map((delivery) => (
                <View
                  key={delivery.id}
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#e5e7eb"
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>
                    {delivery.event} | {delivery.status}
                  </Text>
                  <Text>
                    Attempts: {delivery.attemptCount} | HTTP:{" "}
                    {delivery.httpStatus || "n/a"}
                  </Text>
                  {!!delivery.error && (
                    <Text style={{ color: "#b91c1c" }}>{delivery.error}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}
