import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  createIntegrationAccessRequest,
  createIntegrationConnection,
  listIntegrationConnections,
  listIntegrationProviders,
  testIntegrationConnection,
  type IntegrationConnection,
  type IntegrationProvider
} from "@/api/integrations";

function message(error: any) {
  return String(error?.message || error?.error?.message || "Request failed");
}

export default function DataIntegrationsScreen() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [selected, setSelected] = useState<IntegrationProvider | null>(null);
  const [secret, setSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [requestDraft, setRequestDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const byProvider = useMemo(
    () => new Map(connections.map((connection) => [connection.provider, connection])),
    [connections]
  );

  async function load() {
    setLoading(true);
    try {
      const [providerRows, connectionRows] = await Promise.all([
        listIntegrationProviders(),
        listIntegrationConnections()
      ]);
      setProviders(providerRows);
      setConnections(connectionRows);
    } catch (error) {
      Alert.alert("Integrations unavailable", message(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveConnection() {
    if (!selected) return;
    if (selected.contractStatus === "implemented" && !secret.trim()) {
      return Alert.alert("Credential required", "Enter the provider API key or token.");
    }
    setBusy(true);
    try {
      const connection = await createIntegrationConnection({
        provider: selected.id,
        label: selected.name,
        credentials: secret.trim() ? { apiKey: secret.trim() } : undefined,
        config: baseUrl.trim() ? { baseUrl: baseUrl.trim() } : undefined
      });
      setConnections((rows) => [
        connection,
        ...rows.filter((row) => row.id !== connection.id)
      ]);
      setSecret("");
      Alert.alert("Connection saved", "Credentials were encrypted and stored.");
    } catch (error) {
      Alert.alert("Save failed", message(error));
    } finally {
      setBusy(false);
    }
  }

  async function testConnection(connection: IntegrationConnection) {
    setBusy(true);
    try {
      const updated = await testIntegrationConnection(connection.id);
      setConnections((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row))
      );
      Alert.alert("Connected", `${connection.label} credentials were accepted.`);
    } catch (error) {
      Alert.alert("Connection test failed", message(error));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function prepareAccessRequest(provider: IntegrationProvider) {
    setBusy(true);
    try {
      const request = await createIntegrationAccessRequest(provider.id);
      setSelected(provider);
      setRequestDraft(`${request.subject}\n\n${request.body}`);
      if (request.requestUrl) await Linking.openURL(request.requestUrl);
    } catch (error) {
      Alert.alert("Request preparation failed", message(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Data Integrations</Text>
      <Text style={styles.subtitle}>
        Connect grow sensors, controllers, irrigation, and environmental data.
      </Text>

      {providers.map((provider) => {
        const connection = byProvider.get(provider.id);
        return (
          <Pressable
            key={provider.id}
            style={styles.provider}
            onPress={() => {
              setSelected(provider);
              setRequestDraft("");
            }}
          >
            <View style={styles.row}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.status}>
                {connection?.status || provider.contractStatus}
              </Text>
            </View>
            <Text style={styles.meta}>{provider.capabilities.join(" · ")}</Text>
            <View style={styles.actions}>
              {connection && provider.contractStatus === "implemented" ? (
                <Pressable
                  style={styles.button}
                  onPress={() => testConnection(connection)}
                  disabled={busy}
                >
                  <Text style={styles.buttonText}>Test</Text>
                </Pressable>
              ) : null}
              {provider.contractStatus !== "implemented" ? (
                <Pressable
                  style={styles.button}
                  onPress={() => prepareAccessRequest(provider)}
                  disabled={busy}
                >
                  <Text style={styles.buttonText}>Request access</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        );
      })}

      {selected ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{selected.name}</Text>
          <TextInput
            style={styles.input}
            value={secret}
            onChangeText={setSecret}
            placeholder="API key or access token"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="Base URL or local host (optional)"
            autoCapitalize="none"
          />
          <Pressable
            style={styles.primaryButton}
            onPress={saveConnection}
            disabled={busy}
          >
            <Text style={styles.primaryText}>
              {busy ? "Working..." : "Save encrypted connection"}
            </Text>
          </Pressable>
          {requestDraft ? (
            <Text selectable style={styles.requestDraft}>
              {requestDraft}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#FFFFFF" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#475569", marginBottom: 16 },
  provider: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  providerName: { flex: 1, fontSize: 16, fontWeight: "700" },
  status: { color: "#166534", fontSize: 12, textTransform: "uppercase" },
  meta: { color: "#64748B", marginTop: 6 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonText: { fontWeight: "700" },
  editor: { borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 12, paddingTop: 16 },
  editorTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 6,
    padding: 12,
    alignItems: "center"
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  requestDraft: {
    backgroundColor: "#F8FAFC",
    color: "#334155",
    padding: 12,
    marginTop: 12
  }
});
