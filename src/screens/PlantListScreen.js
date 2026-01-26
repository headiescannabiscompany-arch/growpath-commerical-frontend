import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { getPlants } from "../api/plants";
import AppShell from "../components/AppShell.js";
import PrimaryButton from "../components/PrimaryButton";
import { requirePro } from "../utils/proHelper";

export default function PlantListScreen({ navigation }) {
  const { token, isPro, isEntitled } = useAuth();
  const [plants, setPlants] = useState([]);
  // ... existing code ...

  const handleAddPlant = () => {
    requirePro(navigation, isPro, () => {
      navigation.navigate("CreatePlant");
    });
  };

  const renderPlantItem = ({ item }) => {
    const daysGrowing = item.startDate
      ? Math.floor((new Date() - new Date(item.startDate)) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <TouchableOpacity
        style={styles.plantCard}
        onPress={() => navigation.navigate("PlantDetail", { plantId: item._id })}
      >
        <View style={styles.plantHeader}>
          <Text style={styles.plantName}>{item.name}</Text>
          <View style={[styles.stageBadge, getStageColor(item.stage)]}>
            <Text style={styles.stageText}>{item.stage || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.plantInfo}>
          <Text style={styles.infoLabel}>Strain:</Text>
          <Text style={styles.infoValue}>{item.strain || "Unknown"}</Text>
        </View>

        <View style={styles.plantInfo}>
          <Text style={styles.infoLabel}>Medium:</Text>
          <Text style={styles.infoValue}>{item.growMedium || "N/A"}</Text>
        </View>

        <View style={styles.plantInfo}>
          <Text style={styles.infoLabel}>Days Growing:</Text>
          <Text style={styles.infoValue}>{daysGrowing}</Text>
        </View>

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case "Seedling":
        return styles.stageSeedling;
      case "Vegetative":
        return styles.stageVeg;
      case "Flower":
        return styles.stageFlower;
      case "Drying":
        return styles.stageDrying;
      case "Curing":
        return styles.stageCuring;
      default:
        return styles.stageDefault;
    }
  };

  if (loading) {
    return (
      <AppShell style={styles.container} contentContainerStyle={null}>
        <ActivityIndicator size="large" color="#28A745" style={styles.loader} />
      </AppShell>
    );
  }

  return (
    <AppShell style={styles.container} contentContainerStyle={null}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plants</Text>
        {!isPro && plants.length >= 1 && (
          <Text style={styles.limitText}>Free: 1/1 plant</Text>
        )}
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>🌱</Text>
          <Text style={styles.emptyTitle}>No Plants Yet</Text>
          <Text style={styles.emptySubtitle}>Start tracking your first grow!</Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          renderItem={renderPlantItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.buttonContainer}>
        <PrimaryButton title="Add New Plant" onPress={handleAddPlant} />
        {!isPro && plants.length >= 1 && (
          <Text style={styles.proHint}>⭐ Upgrade to PRO for unlimited plants</Text>
        )}
      </View>
    </AppShell>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  loader: {
    marginTop: 50
  },
  header: {
    padding: 20,
    paddingBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333"
  },
  limitText: {
    fontSize: 14,
    color: "#888",
    marginTop: 4
  },
  listContent: {
    padding: 20,
    paddingTop: 10
  },
  plantCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  plantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  plantName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  stageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF"
  },
  stageSeedling: {
    backgroundColor: "#A8E6CF"
  },
  stageVeg: {
    backgroundColor: "#28A745"
  },
  stageFlower: {
    backgroundColor: "#E056FD"
  },
  stageDrying: {
    backgroundColor: "#FFB84D"
  },
  stageCuring: {
    backgroundColor: "#8B7355"
  },
  stageDefault: {
    backgroundColor: "#6C757D"
  },
  plantInfo: {
    flexDirection: "row",
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    width: 100,
    fontWeight: "500"
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1
  },
  notes: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEE"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center"
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 10
  },
  proHint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 8
  }
};
