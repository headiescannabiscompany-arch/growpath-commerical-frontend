import React, { useEffect, useMemo, useState } from "react";
import { Button, FlatList, Text, TouchableOpacity, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";

type Task = {
  id?: string;
  _id?: string;
  title?: string;
  status?: string;
  sopRunId?: string;
  sopStepId?: string;
};

function getTaskId(t: any): string {
  return String(t?.id || t?._id || "");
}

function normalizeTasks(res: any): Task[] {
  const raw =
    res?.items ??
    res?.tasks ??
    res?.data?.items ??
    res?.data?.tasks ??
    res?.result?.items ??
    res?.result?.tasks ??
    res ??
    [];
  return Array.isArray(raw) ? raw : [];
}

export default function TasksTab() {
  const { selectedId: facilityId, isReady } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<any | null>(null);
  const [sopOnly, setSopOnly] = useState(false);

  const canLoad = useMemo(() => Boolean(isReady && facilityId), [isReady, facilityId]);

  async function load() {
    if (!facilityId) return;

    setLoading(true);
    setUiError(null);

    try {
      const res = await apiRequest({
        method: "GET",
        url: endpoints.tasks(facilityId)
      });

      setItems(normalizeTasks(res));
    } catch (err) {
      setUiError(handleApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canLoad) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, facilityId]);

  const visibleTasks = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    if (!sopOnly) return base;
    return base.filter((t) => Boolean(t?.sopRunId));
  }, [items, sopOnly]);

  async function completeTask(task: Task) {
    if (!facilityId) return;

    setUiError(null);

    try {
      const taskId = String(task?._id || task?.id);
      if (!taskId) return;

      await apiRequest({
        method: "PUT",
        url: endpoints.task(facilityId, taskId),
        body: { status: "completed" }
      });

      // Best-effort SOP sync (won't block task completion)
      if (task?.sopRunId && task?.sopStepId) {
        try {
          await apiRequest({
            method: "PUT",
            url: endpoints.sopRunStep(
              facilityId,
              String(task.sopRunId),
              String(task.sopStepId)
            ),
            body: { status: "done" }
          });
        } catch (e) {
          setUiError(handleApiError(e));
        }
      }

      await load();
    } catch (e) {
      setUiError(handleApiError(e));
    }
  }

  return (
    <ScreenBoundary name="facility.tabs.tasks">
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", marginBottom: 6 }}>
          Facility Tasks
        </Text>

        {!isReady ? (
          <Text>Loading facilities…</Text>
        ) : !facilityId ? (
          <Text>Select a facility to view tasks.</Text>
        ) : uiError ? (
          <View style={{ gap: 12 }}>
            <InlineError
              title={uiError.title || "Couldn’t load tasks"}
              message={uiError.message}
              requestId={uiError.requestId}
            />
            <Button title="Retry" onPress={load} />
          </View>
        ) : loading ? (
          <Text>Loading…</Text>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setSopOnly((v) => !v)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1
                }}
              >
                <Text style={{ fontWeight: "900" }}>
                  {sopOnly ? "SOP only: ON" : "SOP only: OFF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={load}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1
                }}
              >
                <Text style={{ fontWeight: "900" }}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {visibleTasks.length === 0 ? (
              <Text>No tasks yet.</Text>
            ) : (
              <FlatList
                data={visibleTasks}
                keyExtractor={(t, idx) => getTaskId(t) || String(idx)}
                renderItem={({ item }) => (
                  <View
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderRadius: 12,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center"
                    }}
                  >
                    <Text style={{ fontWeight: "900", flexShrink: 1 }}>
                      {item.title || "Untitled Task"}
                    </Text>

                    {item?.sopRunId ? (
                      <View
                        style={{
                          marginLeft: 8,
                          borderWidth: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 999
                        }}
                      >
                        <Text style={{ fontWeight: "900", fontSize: 12 }}>SOP</Text>
                      </View>
                    ) : null}

                    {item.status ? (
                      <Text style={{ opacity: 0.75, marginLeft: 8 }}>{item.status}</Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => completeTask(item)}
                      style={{ marginLeft: "auto" }}
                    >
                      <Text style={{ fontWeight: "900" }}>Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}

  async function load() {
    if (!facilityId) return;

    setLoading(true);
    setUiError(null);

    try {
      const res = await apiRequest({
        method: "GET",
        url: endpoints.tasks(facilityId)
      });

      setItems(normalizeTasks(res));
    } catch (err) {
      setUiError(handleApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canLoad) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, facilityId]);

  const visibleTasks = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    // Add any existing filters here if needed
    if (!sopOnly) return base;
    return base.filter((t: any) => !!t.sopRunId);
  }, [items, sopOnly]);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
          Facility Tasks
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setSopOnly((v) => !v)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: sopOnly ? "#111827" : "#e5e7eb"
            }}
          >
            <Text style={{ fontWeight: "800", color: sopOnly ? "#fff" : "#111827" }}>
              SOP only
            </Text>
          </TouchableOpacity>
        </View>
        {!isReady ? (
          <Text>Loading facilities…</Text>
        ) : !facilityId ? (
          <Text>Select a facility to view tasks.</Text>
        ) : uiError ? (
          <View style={{ gap: 12 }}>
            <InlineError
              title={uiError.title || "Couldn’t load tasks"}
              message={uiError.message}
              requestId={uiError.requestId}
            />
            <Button title="Retry" onPress={load} />
          </View>
        ) : loading ? (
          <Text>Loading…</Text>
        ) : visibleTasks.length === 0 ? (
          <Text>No tasks yet.</Text>
        ) : (
          <FlatList
            data={visibleTasks}
            keyExtractor={(t: any, idx: number) => getTaskId(t) || String(idx)}
            renderItem={({ item }: { item: Task }) => (
              <View
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 8,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center"
                }}
              >
                <Text style={{ fontWeight: "700" }}>{item.title || "Untitled Task"}</Text>
                {item?.sopRunId ? (
                  <View
                    style={{
                      marginLeft: 8,
                      backgroundColor: "#111827",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                      SOP
                    </Text>
                  </View>
                ) : null}
                {item.status ? (
                  <Text style={{ opacity: 0.75, marginLeft: 8 }}>{item.status}</Text>
                ) : null}
                <TouchableOpacity onPress={() => completeTask(item)} style={{ marginLeft: 12 }}>
                  <Text style={{ color: "#2563eb", fontWeight: "700" }}>Complete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
        {error ? (
          <InlineError
            title={error.title || "SOP sync error"}
            message={error.message}
            requestId={error.requestId}
          />
        ) : null}
        )}
      </View>
    </ErrorBoundary>
  );
}
