import React from "react";
import { FlatList } from "react-native";
import { useAutomations } from "../../hooks/useAutomations";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";

import AutomationRow from "../../components/AutomationRow";

export default function AutomationScreen() {
  const { data, isLoading, error, toggleAutomation } = useAutomations();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="Failed to load automation" />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No automation rules"
        description="Enable automation to reduce manual work."
      />
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <AutomationRow
          policy={item}
          onToggle={(enabled) => toggleAutomation({ id: item.id, enabled })}
        />
      )}
    />
  );
}
