import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView
} from "react-native";
import {
  searchCourses,
  filterCourses,
  listCourses,
  getTrendingTags,
  getRecommendedForYou
} from "../api/courses";
import ScreenContainer from "../components/ScreenContainer";
import { extractCourses, extractHasMore } from "../utils/marketplaceTransforms";

export default function MarketplaceScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [recommended, setRecommended] = useState([]);

  async function load(newPage = 1) {
    try {
      setLoading(true);
      const res = await listCourses(newPage);
      const nextCourses = extractCourses(res);
      if (newPage === 1) {
        setCourses(nextCourses);
      } else {
        setCourses((prev) => [...prev, ...nextCourses]);
      }
      setHasMore(extractHasMore(res));
      setPage(newPage);
    } catch (err) {
      console.log("Error loading courses:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    loadTags();
    loadRecommended();
  }, []);

  async function handleSearch(text) {
    setQuery(text);
    try {
      setLoading(true);
      if (text.length === 0) {
        await load(1);
      } else {
        const res = await searchCourses(text);
        const payload = res?.data ?? res ?? [];
        setCourses(Array.isArray(payload) ? payload : []);
        setHasMore(false); // Search results don't paginate
      }
    } catch (err) {
      console.log("Error searching:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFilter(sort) {
    try {
      setLoading(true);
      const res = await filterCourses({ sort });
      const payload = res?.data ?? res ?? [];
      setCourses(Array.isArray(payload) ? payload : []);
      setHasMore(false); // Filtered results don't paginate
    } catch (err) {
      console.log("Error filtering:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      load(page + 1);
    }
  };

  async function loadTags() {
    try {
      const res = await getTrendingTags();
      const payload = res?.data ?? res ?? [];
      setTags(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.log("Error loading tags:", err.message);
    }
  }

  async function loadRecommended() {
    try {
      const res = await getRecommendedForYou();
      const payload = res?.data ?? res ?? [];
      setRecommended(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.log("Error loading recommended:", err.message);
    }
  }

  function renderCourse({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Course", { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.category && <Text style={styles.category}>{item.category}</Text>}
        </View>
        <Text style={styles.creator}>
          By{" "}
          {item.creator?.name ||
            item.creator?.displayName ||
            item.creator?.username ||
            "Unknown"}
        </Text>
        {item.difficulty && <Text style={styles.difficulty}>📚 {item.difficulty}</Text>}
        <View style={styles.footer}>
          <Text style={styles.rating}>
            ⭐ {item.rating.toFixed(1)} ({item.ratingCount})
          </Text>
          <Text style={styles.price}>
            {item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Discover Courses</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => navigation.navigate("CategoryBrowser")}
        >
          <Text style={styles.browseBtnText}>🏷️ Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.search}
        placeholder="Search courses..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={handleSearch}
      />

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <TouchableOpacity style={styles.filterBtn} onPress={() => handleFilter("rating")}>
          <Text style={styles.filterBtnText}>⭐ Top Rated</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => handleFilter("students")}
        >
          <Text style={styles.filterBtnText}>👥 Most Popular</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => handleFilter("newest")}>
          <Text style={styles.filterBtnText}>✨ Newest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => load(1)}>
          <Text style={styles.filterBtnText}>🔄 Reset</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Trending Tags */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          {tags.map((t) => (
            <TouchableOpacity key={t} style={styles.tag} onPress={() => handleSearch(t)}>
              <Text style={styles.tagText}>#{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Course List */}
      {/* Recommended For You */}
      {recommended.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Recommended For You</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            {recommended.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.recCard}
                onPress={() => navigation.navigate("Course", { id: item._id })}
              >
                {/* thumbnail optional; fallback to category text */}
                <View style={styles.recImage} />
                <Text style={styles.recTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recRating}>
                  ⭐ {Number(item.rating || 0).toFixed(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
      {courses.length > 0 ? (
        <FlatList
          data={courses}
          keyExtractor={(item, idx) => item._id + idx}
          renderItem={renderCourse}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {loading ? "Loading courses..." : "No courses found"}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c3e50"
  },
  browseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#3498db",
    borderRadius: 8
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12
  },
  search: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  filtersContainer: {
    marginBottom: 15,
    marginHorizontal: -20,
    paddingHorizontal: 20
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#27ae60",
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center"
  },
  filterBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 8
  },
  tagText: { fontWeight: "600", color: "#444" },
  listContent: {
    paddingBottom: 80
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10
  },
  recCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#eee"
  },
  recImage: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    backgroundColor: "#f0f0f0"
  },
  recTitle: {
    fontWeight: "700",
    marginTop: 6
  },
  recRating: {
    color: "#777",
    marginTop: 3
  },
  card: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    flex: 1,
    marginRight: 8
  },
  category: {
    fontSize: 11,
    backgroundColor: "#ecf0f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: "#555",
    fontWeight: "600"
  },
  creator: {
    fontSize: 12,
    color: "#777",
    marginBottom: 6
  },
  difficulty: {
    fontSize: 12,
    color: "#27ae60",
    marginBottom: 8,
    fontWeight: "600"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rating: {
    fontSize: 12,
    color: "#f39c12",
    fontWeight: "600"
  },
  price: {
    fontWeight: "700",
    fontSize: 16,
    color: "#27ae60"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "600"
  }
});
