import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CommercialCourse,
  createCommercialCourse,
  fetchCommercialCourses
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

type CourseForm = {
  title: string;
  description: string;
  category: string;
  access: "free" | "paid" | "followers" | "customers" | "private";
  price: string;
  linkedProductIds: string;
  linkedProductLineIds: string;
  linkedGrowIds: string;
};

const EMPTY_FORM: CourseForm = {
  title: "",
  description: "",
  category: "product_education",
  access: "free",
  price: "",
  linkedProductIds: "",
  linkedProductLineIds: "",
  linkedGrowIds: ""
};

function splitIds(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function courseId(course: CommercialCourse) {
  return course.id || course._id || course.title || "course";
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialCoursesRoute() {
  const [courses, setCourses] = useState<CommercialCourse[]>([]);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const publishedCount = useMemo(
    () => courses.filter((course) => course.status === "published").length,
    [courses]
  );
  const paidCount = useMemo(
    () => courses.filter((course) => course.access === "paid").length,
    [courses]
  );

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      setCourses(await fetchCommercialCourses());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function submitCourse() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCommercialCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "product_education",
        access: form.access,
        price: form.access === "paid" ? Number(form.price) || 0 : 0,
        linkedProductIds: splitIds(form.linkedProductIds),
        linkedProductLineIds: splitIds(form.linkedProductLineIds),
        linkedGrowIds: splitIds(form.linkedGrowIds),
        status: "draft"
      });
      setForm(EMPTY_FORM);
      await loadCourses();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-courses"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Commercial Course Builder</Text>
            <Text style={styles.subtitle}>
              Commercial courses should teach product use, grow methods, plant care,
              seasonal gardening, and customer onboarding with products and trials
              attached.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/courses" label="Open Course Catalog" />
            <ActionLink href="/courses/create" label="Universal Course Creator" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ActionLink href="/home/commercial/products" label="Products" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Course creation workflow</Text>
        <Text style={styles.body}>
          All user types can create courses. Commercial courses should add business
          context: product use, grow methods, plant care, seasonal gardening, and customer
          onboarding.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{courses.length}</Text>
            <Text style={styles.metricLabel}>Courses</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{publishedCount}</Text>
            <Text style={styles.metricLabel}>Published</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{paidCount}</Text>
            <Text style={styles.metricLabel}>Paid</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading commercial courses...</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create commercial course</Text>
        <TextInput
          value={form.title}
          onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          accessibilityLabel="Commercial course title"
          placeholder="Course title"
          style={styles.input}
        />
        <TextInput
          value={form.category}
          onChangeText={(category) => setForm((prev) => ({ ...prev, category }))}
          accessibilityLabel="Commercial course category"
          placeholder="Category"
          style={styles.input}
        />
        <TextInput
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
          accessibilityLabel="Commercial course description"
          multiline
          placeholder="What this course teaches and who it helps"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.formGrid}>
          <TextInput
            value={form.linkedProductIds}
            onChangeText={(linkedProductIds) =>
              setForm((prev) => ({ ...prev, linkedProductIds }))
            }
            accessibilityLabel="Commercial course linked products"
            placeholder="Linked product IDs, comma separated"
            style={styles.input}
          />
          <TextInput
            value={form.linkedProductLineIds}
            onChangeText={(linkedProductLineIds) =>
              setForm((prev) => ({ ...prev, linkedProductLineIds }))
            }
            accessibilityLabel="Commercial course linked product lines"
            placeholder="Linked product line IDs"
            style={styles.input}
          />
          <TextInput
            value={form.linkedGrowIds}
            onChangeText={(linkedGrowIds) =>
              setForm((prev) => ({ ...prev, linkedGrowIds }))
            }
            accessibilityLabel="Commercial course linked grows"
            placeholder="Linked grow/trial IDs"
            style={styles.input}
          />
          <TextInput
            value={form.price}
            onChangeText={(price) => setForm((prev) => ({ ...prev, price }))}
            accessibilityLabel="Commercial course price"
            keyboardType="decimal-pad"
            placeholder="Price if paid"
            style={styles.input}
          />
        </View>
        <View style={styles.actions}>
          {(
            [
              "free",
              "paid",
              "followers",
              "customers",
              "private"
            ] as CourseForm["access"][]
          ).map((access) => (
            <Pressable
              key={access}
              accessibilityRole="button"
              accessibilityLabel={`Set commercial course access ${access}`}
              onPress={() => setForm((prev) => ({ ...prev, access }))}
              style={[
                styles.action,
                form.access === access ? styles.actionSelected : null
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  form.access === access ? styles.actionTextSelected : null
                ]}
              >
                {access}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create commercial course"
          disabled={saving || !form.title.trim()}
          onPress={submitCourse}
          style={[
            styles.primaryAction,
            saving || !form.title.trim() ? styles.disabled : null
          ]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Creating..." : "Create Course"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Current commercial courses</Text>
        {courses.length ? (
          <View style={styles.list}>
            {courses.map((course) => (
              <View key={courseId(course)} style={styles.courseRow}>
                <Text style={styles.courseTitle}>
                  {course.title || "Untitled course"}
                </Text>
                <Text style={styles.courseMeta}>
                  {[course.category, course.access || "free", course.status || "draft"]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {course.description ? (
                  <Text style={styles.courseBody}>{course.description}</Text>
                ) : null}
                <View style={styles.actions}>
                  <ActionLink
                    href={`/home/commercial/courses/${encodeURIComponent(courseId(course))}`}
                    label="Open Detail"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No commercial courses yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Product education</Text>
        <Text style={styles.body}>
          A commercial course should be able to teach exactly how to use a product,
          formula, plant line, or service and then route users to the correct public
          store/product/support destination.
        </Text>
        <Text style={styles.bullet}>
          Attach product IDs or product-line IDs to course metadata
        </Text>
        <Text style={styles.bullet}>
          Use trial results and grow reports as lesson evidence
        </Text>
        <Text style={styles.bullet}>
          Announce course updates through linked feed campaigns
        </Text>
        <Text style={styles.bullet}>
          Send users back to public product pages and forum support threads
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/storefront" label="Storefront" />
          <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Free and paid courses</Text>
        <Text style={styles.body}>
          Free, Pro, commercial, and facility users can create courses. Commercial
          accounts should use pricing and access levels intentionally rather than hiding
          course creation behind a separate creator mode.
        </Text>
        <Text style={styles.bullet}>
          Free courses for product education, onboarding, and support
        </Text>
        <Text style={styles.bullet}>
          Paid courses for deeper training or professional programs
        </Text>
        <Text style={styles.bullet}>
          Public profiles and storefronts can surface related courses
        </Text>
        <Text style={styles.bullet}>
          Course announcements should link to products, trials, or storefronts when
          relevant
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/courses" label="Open Course Catalog" />
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 440
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 130,
    padding: 9
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    fontSize: 14,
    minWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8
  },
  textArea: {
    minHeight: 82,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionSelected: {
    backgroundColor: "#166534"
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  actionTextSelected: {
    color: "#FFFFFF"
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  list: {
    gap: 10,
    marginTop: 12
  },
  courseRow: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  courseTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900"
  },
  courseMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  courseBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  bullet: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  muted: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10
  }
});
