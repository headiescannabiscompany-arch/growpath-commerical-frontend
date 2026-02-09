import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import InlineError from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { usePlants } from "../../hooks/usePlants";

export default function PlantsScreen() {
  const navigation = useNavigation<any>();

  const { data, isLoading, error, refetch } = usePlants();

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const plants = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

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

      {plants.length === 0 ? (
        <EmptyState
          title="No plants added"
          description="Add your first plant to start tracking health and progress."
          actionLabel="Add your first plant"
          onAction={() => navigation.navigate("AddPlant")}
        />
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(p: any, idx) => String(p?.id ?? p?._id ?? p?.plantId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.name || "Untitled Plant"}</Text>
          )}
        />
      )}
    </View>
  );
}
