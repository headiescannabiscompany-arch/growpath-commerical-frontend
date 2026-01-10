import React from "react";
import {
  View,
  Text,
  StyleSheet
} from "react-native";

const TeamScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Team Management</Text>
        <Text style={styles.placeholder}>Coming in Phase 2</Text>
        <Text style={styles.description}>
          Phase 2 will include team member management, role assignment, and permission controls.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8
  },
  placeholder: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 12
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20
  }
});

export default TeamScreen;
