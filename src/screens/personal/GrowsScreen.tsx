import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import InlineError from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { useGrows } from "../../hooks/useGrows";

export default function GrowsScreen() {
  const navigation = useNavigation<any>();

  const { data, isLoading, error, refetch } = useGrows();

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const grows = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => refetch()}
          style={{ margin: 16 }}
        />
      ) : null}

      {grows.length === 0 ? (
        <EmptyState
          title="No grows yet"
          description="Create your first grow to start tracking plants and daily progress."
          actionLabel="Create your first grow"
          onAction={() => navigation.navigate("CreateGrow")}
        />
      ) : (
        <FlatList
          data={grows}
          keyExtractor={(g: any, idx) => String(g?.id ?? g?._id ?? g?.growId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.name || "Untitled Grow"}</Text>
          )}
        />
      )}
    </View>
  );
}
import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import InlineError from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { useGrows } from "../../hooks/useGrows";

export default function GrowsScreen() {
  const navigation = useNavigation<any>();

  // Data hook (ideally uses apiRequest internally; we can refactor the hook next if needed)
  const { data, isLoading, error, refetch } = useGrows();

  // Contract-locked error handling + InlineError UI surface
  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const grows = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Unified screen shell: InlineError renders inline (not a blocking full-screen alert)
  return (
    <View style={{ flex: 1 }}>
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => refetch()}
          style={{ margin: 16 }}
        />
      ) : null}

      {grows.length === 0 ? (
        <EmptyState
          title="No grows yet"
          description="Create your first grow to start tracking plants and daily progress."
          actionLabel="Create your first grow"
          onAction={() => navigation.navigate("CreateGrow")}
        />
      ) : (
        <FlatList
          data={grows}
          keyExtractor={(g: any, idx) => String(g?.id ?? g?._id ?? g?.growId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.name || "Untitled Grow"}</Text>
          )}
        />
      )}
    </View>
  );
}
