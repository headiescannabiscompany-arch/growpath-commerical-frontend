import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  ImageBackground,
  LinearGradient
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getCategories } from "../api/courses";
import { useAuth } from "../context/AuthContext";

// Organized grow guide categories with visual themes
const GROW_CATEGORIES = [
  {
    id: "basics",
    name: "Basics",
    icon: "🌱",
    description: "Essential growing fundamentals",
    gradient: ["#10b981", "#059669"],
    isPremium: false,
    topics: ["Germination", "Seedling Care", "Plant Anatomy", "Growth Stages"]
  },
  {
    id: "lighting",
    name: "Lighting",
    icon: "💡",
    description: "Light requirements & optimization",
    gradient: ["#f59e0b", "#d97706"],
    isPremium: false,
    topics: ["PPFD/DLI", "Light Types", "Photoperiod", "Light Schedules"]
  },
  {
    id: "watering",
    name: "Watering",
    icon: "💧",
    description: "Irrigation & nutrient delivery",
    gradient: ["#3b82f6", "#2563eb"],
    isPremium: false,
    topics: ["pH Management", "Watering Schedule", "Runoff", "Hydroponics"]
  },
  {
    id: "airflow",
    name: "Airflow & Climate",
    icon: "🌬️",
    description: "Temperature, humidity & ventilation",
    gradient: ["#8b5cf6", "#7c3aed"],
    isPremium: true,
    topics: ["VPD", "Air Circulation", "CO2", "Climate Control"]
  },
  {
    id: "training",
    name: "Plant Training",
    icon: "✂️",
    description: "LST, HST & canopy management",
    gradient: ["#ec4899", "#db2777"],
    isPremium: true,
    topics: ["LST", "Topping/FIMing", "Defoliation", "Main-lining"]
  },
  {
    id: "scrog",
    name: "SCROG",
    icon: "🕸️",
    description: "Screen of Green techniques",
    gradient: ["#14b8a6", "#0d9488"],
    isPremium: true,
    topics: ["Screen Setup", "Training", "Timing", "Maintenance"]
  },
  {
    id: "nutrients",
    name: "Nutrients",
    icon: "🧪",
    description: "Feeding schedules & deficiencies",
    gradient: ["#f97316", "#ea580c"],
    isPremium: false,
    topics: ["NPK Ratios", "Deficiencies", "Feeding Charts", "Organic vs Synthetic"]
  },
  {
    id: "pests",
    name: "Pest & Disease",
    icon: "🐛",
    description: "IPM & problem solving",
    gradient: ["#ef4444", "#dc2626"],
    isPremium: true,
    topics: ["Common Pests", "Fungal Issues", "IPM", "Prevention"]
  },
  {
    id: "harvest",
    name: "Harvest & Cure",
    icon: "🌿",
    description: "Harvesting, drying & curing",
    gradient: ["#a855f7", "#9333ea"],
    isPremium: true,
    topics: ["Trichome Inspection", "Drying", "Curing", "Storage"]
  }
];

export default function CategoryBrowserScreen({ navigation }) {
  const { isPro } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await getCategories();
      setCategories(res.data || res || []);
    } catch (err) {
      console.log("Error loading categories:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleCategoryPress(category) {
    if (category.isPremium && !isPro) {
      navigation.navigate("Subscription");
    } else {
      navigation.navigate("CategoryCourses", { category: category.name });
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1530227365105-dc07290d5f05?w=800"
        }}
        style={styles.headerBg}
        blurRadius={5}
      >
        <View style={styles.headerOverlay}>
          <Text style={styles.header}>🌿 Grow Guides</Text>
          <Text style={styles.subtitle}>Master every aspect of cultivation</Text>
        </View>
      </ImageBackground>

      <FlatList
        data={GROW_CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.gradientCard, { backgroundColor: item.gradient[0] }]}>
              {/* Transparent overlay pattern */}
              <View style={styles.patternOverlay}>
                <Text style={styles.pattern}>🍃</Text>
                <Text style={[styles.pattern, styles.pattern2]}>💧</Text>
                <Text style={[styles.pattern, styles.pattern3]}>✨</Text>
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={styles.categoryName}>{item.name}</Text>

                {item.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>⭐ PREMIUM</Text>
                  </View>
                )}

                <Text style={styles.categoryDesc} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.topicsList}>
                  {item.topics.slice(0, 2).map((topic, idx) => (
                    <Text key={idx} style={styles.topicDot}>
                      • {topic}
                    </Text>
                  ))}
                  {item.topics.length > 2 && (
                    <Text style={styles.topicMore}>+{item.topics.length - 2} more</Text>
                  )}
                </View>
              </View>

              {/* Glass effect overlay at bottom */}
              <View style={styles.glassOverlay} />
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    height: 140,
    width: "100%",
    marginBottom: 16
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 185, 129, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  header: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textShadow: "0px 2px 4px rgba(0,0,0,0.3)"
  },
  subtitle: {
    fontSize: 15,
    color: "#f0fdf4",
    marginTop: 4,
    fontWeight: "500"
  },
  listContent: {
    padding: 12,
    paddingBottom: 80
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16
  },
  categoryCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  gradientCard: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative"
  },
  patternOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15
  },
  pattern: {
    position: "absolute",
    fontSize: 80,
    top: -10,
    right: -10,
    opacity: 0.3
  },
  pattern2: {
    fontSize: 50,
    top: 60,
    left: -5,
    opacity: 0.2
  },
  pattern3: {
    fontSize: 40,
    bottom: 20,
    right: 15,
    opacity: 0.25
  },
  cardContent: {
    flex: 1,
    padding: 14,
    zIndex: 2
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  categoryName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    textShadow: "0px 1px 2px rgba(0,0,0,0.2)"
  },
  premiumBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)"
  },
  premiumText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  categoryDesc: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 16
  },
  topicsList: {
    marginTop: "auto"
  },
  topicDot: {
    fontSize: 10,
    color: "#fff",
    opacity: 0.85,
    marginBottom: 2
  },
  topicMore: {
    fontSize: 10,
    color: "#fff",
    opacity: 0.7,
    fontStyle: "italic",
    marginTop: 2
  },
  glassOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)"
  }
});
