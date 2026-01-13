import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAuth } from "../context/AuthContext";
import { getPlantWithLogs, exportPlantPdf } from "../api/plants";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";

const screenWidth = Dimensions.get("window").width;

export default function PlantDetailScreen({ route, navigation }) {
  const { plantId } = route.params;
  const { token } = useAuth();
  const [plant, setPlant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadPlantData();
  }, []);

  const loadPlantData = async () => {
    try {
      setLoading(true);
      const data = await getPlantWithLogs(plantId, token);
      setPlant(data.plant);
      setLogs(data.logs || []);
      if (data.logs?.length > 0) {
        setSelectedLogIndex(data.logs.length - 1); // Show latest log
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load plant data");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      Alert.alert("Export", "PDF export will download to your device", [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Export",
          onPress: async () => {
            try {
              await exportPlantPdf(plantId, token);
              Alert.alert("Success", "PDF exported successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to export PDF");
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert("Error", "Export failed");
    }
  };

  const handleAddLog = () => {
    navigation.navigate("CreatePlantLog", { plantId });
  };

  const renderGrowthChart = () => {
    const heightLogs = logs.filter((l) => typeof l.heightCm === "number");

    if (heightLogs.length < 2) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>
            Add more height logs to see growth chart
          </Text>
        </View>
      );
    }

    const chartData = {
      labels: heightLogs.map((_, index) => `Day ${index + 1}`),
      datasets: [
        {
          data: heightLogs.map((l) => l.heightCm),
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: "#FFF",
          backgroundGradientFrom: "#FFF",
          backgroundGradientTo: "#FFF",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#28A745"
          }
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderBeforeAfter = () => {
    if (logs.length === 0) return null;

    const firstLog = logs[0];
    const selectedLog = logs[selectedLogIndex];

    const firstPhoto = firstLog?.photos?.[0];
    const currentPhoto = selectedLog?.photos?.[0];

    return (
      <View style={styles.beforeAfterContainer}>
        <Text style={styles.sectionTitle}>Progress</Text>

        <View style={styles.photoRow}>
          <View style={styles.photoContainer}>
            <Text style={styles.photoLabel}>Before</Text>
            {firstPhoto ? (
              <Image source={{ uri: firstPhoto }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>No photo</Text>
              </View>
            )}
            <Text style={styles.photoDate}>
              {firstLog?.date ? new Date(firstLog.date).toLocaleDateString() : "N/A"}
            </Text>
          </View>

          <View style={styles.photoContainer}>
            <Text style={styles.photoLabel}>
              {selectedLogIndex === logs.length - 1
                ? "Now"
                : "Day " + (selectedLogIndex + 1)}
            </Text>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>No photo</Text>
              </View>
            )}
            <Text style={styles.photoDate}>
              {selectedLog?.date
                ? new Date(selectedLog.date).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        {logs.length > 1 && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Slide to compare:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timelineScroll}
            >
              {logs.map((log, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timelineItem,
                    selectedLogIndex === index && styles.timelineItemActive
                  ]}
                  onPress={() => setSelectedLogIndex(index)}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      selectedLogIndex === index && styles.timelineTextActive
                    ]}
                  >
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <ActivityIndicator size="large" color="#28A745" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!plant) {
    return (
      <ScreenContainer style={styles.container}>
        <Text style={styles.errorText}>Plant not found</Text>
      </ScreenContainer>
    );
  }

  const daysGrowing = plant.startDate
    ? Math.floor((new Date() - new Date(plant.startDate)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.plantName}>{plant.name}</Text>
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>{plant.stage || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Strain:</Text>
            <Text style={styles.infoValue}>{plant.strain || "Unknown"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Medium:</Text>
            <Text style={styles.infoValue}>{plant.growMedium || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Days Growing:</Text>
            <Text style={styles.infoValue}>{daysGrowing}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Logs:</Text>
            <Text style={styles.infoValue}>{logs.length}</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Growth Chart</Text>
          {renderGrowthChart()}
        </View>

        {renderBeforeAfter()}

        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>No logs yet</Text>
          ) : (
            logs
              .slice()
              .reverse()
              .slice(0, 5)
              .map((log, index) => (
                <View key={index} style={styles.logCard}>
                  <Text style={styles.logDate}>
                    {log.date ? new Date(log.date).toLocaleDateString() : "N/A"}
                  </Text>
                  {log.heightCm && (
                    <Text style={styles.logDetail}>Height: {log.heightCm} cm</Text>
                  )}
                  {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                </View>
              ))
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Add Log Entry" onPress={handleAddLog} />
          <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
            <Text style={styles.exportButtonText}>📄 Export PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
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
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  plantName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    flex: 1
  },
  stageBadge: {
    backgroundColor: "#28A745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  stageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF"
  },
  infoCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    width: 120,
    fontWeight: "500"
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  chartPlaceholder: {
    backgroundColor: "#FFF",
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center"
  },
  beforeAfterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  photoRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  photoContainer: {
    flex: 1,
    marginHorizontal: 5
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center"
  },
  photo: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#FFF"
  },
  photoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEE"
  },
  photoDate: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 6
  },
  sliderContainer: {
    marginTop: 20
  },
  sliderLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  timelineScroll: {
    flexDirection: "row"
  },
  timelineItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8
  },
  timelineItemActive: {
    backgroundColor: "#28A745"
  },
  timelineText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600"
  },
  timelineTextActive: {
    color: "#FFF"
  },
  logsSection: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  noLogsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 20
  },
  logCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  logDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4
  },
  logDetail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2
  },
  logNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4
  },
  actions: {
    padding: 20
  },
  exportButton: {
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#28A745"
  },
  exportButtonText: {
    color: "#28A745",
    fontSize: 16,
    fontWeight: "bold"
  }
};
