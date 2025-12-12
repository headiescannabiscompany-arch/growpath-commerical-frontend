import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, Linking } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getCourse, enrollInCourse, getEnrollmentStatus, getReviews, deleteReview, getRecommendedCourses } from "../api/courses";
import { getQuestions, deleteQuestion, deleteAnswer } from "../api/questions";
import { createCheckout } from "../api/payments";

export default function CourseScreen({ route, navigation }) {
  const { id } = route.params;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getCourse(id);
    const payload = res || res.data || {};
    setCourse(payload.course || payload);
    setLessons(payload.lessons || []);
    setEnrollment(payload.enrollment || null);

    if (global.user) {
      const status = await getEnrollmentStatus(id);
      const s = status || status.data || {};
      setEnrolled(!!s.enrolled);
    }

    await loadReviews();
    await loadQuestions();
    await loadRecommended();
  }

  async function loadReviews() {
    try {
      const res = await getReviews(id);
      setReviews(res || res.data || []);
    } catch (err) {
      console.log("Error loading reviews:", err.message);
    }
  }

  async function loadQuestions() {
    try {
      const res = await getQuestions(id);
      setQuestions(res || res.data || []);
    } catch (err) {
      console.log("Error loading questions:", err.message);
    }
  }

  async function loadRecommended() {
    try {
      const res = await getRecommendedCourses(id);
      setRecommended(res || res.data || []);
    } catch (err) {
      console.log("Error loading recommendations:", err.message);
    }
  }

  function calculateProgress(lessonsList, enrollmentData) {
    if (!enrollmentData) return 0;
    const completed = enrollmentData.completedLessons?.length || 0;
    const total = lessonsList.length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  async function handleEnroll() {
    if (course.price > 0) {
      if (!global.user) {
        Alert.alert("Sign in Required", "Please sign in to purchase courses.");
        return;
      }

      try {
        const success = encodeURIComponent("growpath://course/" + course._id + "?success=1");
        const cancel = encodeURIComponent("growpath://course/" + course._id + "?cancel=1");

        const res = await createCheckout(course._id, success, cancel);
        const checkoutUrl = res.url || res.data?.url;

        if (checkoutUrl) {
          // Opens the Stripe checkout page in browser
          Linking.openURL(checkoutUrl);
        } else {
          Alert.alert("Error", "Failed to create checkout session");
        }
      } catch (err) {
        Alert.alert("Error", err.message || "Failed to start checkout");
      }
      return;
    }

    // free enrollment
    await enrollInCourse(id);
    setEnrolled(true);
  }

  function openLesson(lesson) {
    if (!enrolled) {
      Alert.alert("Enroll First", "You must enroll to view lessons.");
      return;
    }
    navigation.navigate("Lesson", { lesson });
  }

  if (!course) return <ScreenContainer><Text>Loading…</Text></ScreenContainer>;

  return (
    <ScreenContainer scroll>
      {course.coverImage ? <Image source={{ uri: course.coverImage }} style={styles.cover} /> : null}

      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.creator}>By {course.creator?.username || course.creator?.name}</Text>
      <Text style={styles.desc}>{course.description}</Text>

      {!enrolled && (
        <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll}>
          <Text style={styles.enrollText}>
            {course.price > 0 ? `Buy for $${course.price}` : "Enroll for Free"}
          </Text>
        </TouchableOpacity>
      )}

      {enrolled && (
        <Text style={styles.enrolledText}>✓ Enrolled — Start Learning</Text>
      )}

      {enrolled && enrollment && (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>
            Progress: {calculateProgress(lessons, enrollment)}%
          </Text>

          {enrollment.lastLessonId && (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => {
                const lastLesson = lessons.find(
                  (l) => l._id === enrollment.lastLessonId
                );
                if (lastLesson) {
                  navigation.navigate("Lesson", { lesson: lastLesson, courseId: course._id });
                }
              }}
            >
              <Text style={styles.resumeText}>Continue Learning →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.section}>Lessons</Text>

      <FlatList
        data={lessons}
        keyExtractor={(l) => l._id}
        renderItem={({ item }) => {
          const isComplete = enrollment?.completedLessons?.includes(item._id);
          return (
            <TouchableOpacity style={styles.lesson} onPress={() => openLesson(item)}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Text style={{ color: isComplete ? "#27ae60" : "#ccc", marginRight: 8, fontSize: 16 }}>
                  {isComplete ? "✓" : "○"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>
                    {item.order}. {item.title}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {item.videoUrl ? "Video" : item.pdfUrl ? "PDF" : "Text"}
                  </Text>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Text style={styles.section}>Reviews</Text>

      {enrolled && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate("WriteReview", { courseId: course._id })}
        >
          <Text style={styles.reviewBtnText}>Write a Review</Text>
        </TouchableOpacity>
      )}

      {course.rating > 0 && (
        <View style={styles.ratingOverview}>
          <Text style={styles.ratingText}>
            {course.rating.toFixed(1)} ★ ({course.ratingCount} reviews)
          </Text>
        </View>
      )}

      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              {item.user.avatar ? (
                <Image
                  source={{ uri: item.user.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: "#ccc" }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>{item.user.username}</Text>
                <Text style={styles.stars}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</Text>
              </View>
              {item.user._id === global.user?._id && (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await deleteReview(course._id);
                      await loadReviews();
                    } catch (err) {
                      Alert.alert("Error", err.message);
                    }
                  }}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {item.text ? (
              <Text style={styles.reviewText}>{item.text}</Text>
            ) : null}
          </View>
        )}
      />

      <Text style={styles.section}>Q&A</Text>

      {enrolled && (
        <TouchableOpacity
          style={styles.askBtn}
          onPress={() => navigation.navigate("AskQuestion", { courseId: course._id })}
        >
          <Text style={styles.askText}>Ask a Question</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={questions}
        keyExtractor={(q) => q._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.questionBox}>
            <View style={styles.row}>
              {item.user.avatar ? (
                <Image source={{ uri: item.user.avatar }} style={styles.questionAvatar} />
              ) : (
                <View style={[styles.questionAvatar, { backgroundColor: "#ccc" }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>{item.user.username}</Text>
                <Text style={styles.questionTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              {item.user._id === global.user?._id && (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await deleteQuestion(course._id, item._id);
                      await loadQuestions();
                    } catch (err) {
                      Alert.alert("Error", err.message);
                    }
                  }}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {item.user._id === course.creator._id && (
              <Text style={styles.creatorBadge}>👨‍🏫 Creator</Text>
            )}

            <Text style={styles.questionText}>{item.text}</Text>

            {/* Answers */}
            {item.answers && item.answers.length > 0 && (
              <View style={styles.answersSection}>
                <Text style={styles.answersCount}>{item.answers.length} {item.answers.length === 1 ? "answer" : "answers"}</Text>
                {item.answers.map((ans) => (
                  <View key={ans._id} style={styles.answerRow}>
                    {ans.user.avatar ? (
                      <Image source={{ uri: ans.user.avatar }} style={styles.answerAvatar} />
                    ) : (
                      <View style={[styles.answerAvatar, { backgroundColor: "#ccc" }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.answerName}>{ans.user.username}</Text>
                        {ans.user._id === global.user?._id && (
                          <TouchableOpacity
                            onPress={async () => {
                              try {
                                await deleteAnswer(course._id, ans._id);
                                await loadQuestions();
                              } catch (err) {
                                Alert.alert("Error", err.message);
                              }
                            }}
                          >
                            <Text style={styles.deleteText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.answerText}>{ans.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Reply button */}
            {enrolled && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("AnswerQuestion", {
                    courseId: course._id,
                    questionId: item._id,
                  })
                }
              >
                <Text style={styles.replyLink}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Recommended Courses */}
      {recommended.length > 0 && (
        <View style={styles.recSection}>
          <Text style={styles.recTitle}>Recommended Courses</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
            {recommended.map((rec) => (
              <TouchableOpacity
                key={rec._id}
                style={styles.recCard}
                onPress={() => navigation.push("Course", { id: rec._id })}
              >
                {rec.coverImage && (
                  <Image source={{ uri: rec.coverImage }} style={styles.recCover} />
                )}
                <Text style={styles.recTitle2} numberOfLines={2}>
                  {rec.title}
                </Text>
                <Text style={styles.recCreator}>{rec.creator?.username || "Unknown"}</Text>
                <View style={styles.recRatingRow}>
                  <Text style={styles.recRating}>
                    ⭐ {rec.rating ? rec.rating.toFixed(1) : "N/A"}
                  </Text>
                  <Text style={styles.recPrice}>
                    {rec.price === 0 ? "FREE" : `$${rec.price}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cover: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  creator: { color: "#555", marginBottom: 10 },
  desc: { marginBottom: 20 },
  enrollBtn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  enrollText: { color: "white", fontWeight: "700", textAlign: "center" },
  enrolledText: {
    color: "#27ae60",
    fontWeight: "700",
    marginBottom: 20,
    fontSize: 16,
  },
  progressBox: {
    backgroundColor: "#eefaf0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontWeight: "600",
    marginBottom: 6,
  },
  resumeBtn: {
    backgroundColor: "#2ecc71",
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  resumeText: {
    color: "white",
    fontWeight: "700",
  },
  section: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  lesson: {
    paddingVertical: 14,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  lessonTitle: { fontWeight: "600" },
  lessonMeta: { color: "#777", fontSize: 12 },
  arrow: { fontSize: 28, color: "#ccc" },
  reviewBtn: {
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewBtnText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
  },
  ratingOverview: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  ratingText: {
    fontWeight: "700",
    fontSize: 16,
  },
  reviewCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  stars: {
    color: "#f1c40f",
    fontSize: 12,
  },
  reviewText: {
    color: "#333",
    fontSize: 14,
    lineHeight: 20,
  },
  deleteText: {
    color: "#e74c3c",
    fontSize: 18,
    fontWeight: "700",
  },
  askBtn: {
    backgroundColor: "#9b59b6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  askText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
  },
  questionBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  questionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  questionTime: {
    fontSize: 12,
    color: "#999",
  },
  creatorBadge: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "700",
    marginBottom: 6,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  answersSection: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2ecc71",
  },
  answersCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2ecc71",
    marginBottom: 8,
  },
  answerRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  answerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  answerName: {
    fontWeight: "600",
    fontSize: 13,
  },
  answerText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
    marginTop: 4,
  },
  replyLink: {
    color: "#9b59b6",
    fontWeight: "700",
    fontSize: 13,
  },
  recSection: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  recTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  recScroll: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  recCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recCover: {
    width: "100%",
    height: 80,
    backgroundColor: "#e0e0e0",
  },
  recTitle2: {
    fontSize: 12,
    fontWeight: "600",
    padding: 8,
    color: "#333",
  },
  recCreator: {
    fontSize: 11,
    color: "#666",
    paddingHorizontal: 8,
  },
  recRatingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: 4,
  },
  recRating: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f39c12",
  },
  recPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: "#27ae60",
  },
});