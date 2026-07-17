import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import {
  CommercialCourse,
  createCommercialCourse,
  fetchCommercialCourses,
  fetchProductLines,
  ProductLine
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";

type CourseForm = {
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string;
  category: string;
  growInterests: string;
  skillLevel: string;
  access: "free" | "paid" | "followers" | "customers" | "private";
  price: string;
  stripeProductId: string;
  stripePriceId: string;
  linkedProductIds: string;
  linkedProductLineIds: string;
  linkedGrowIds: string;
  linkedLiveIds: string;
  linkedVideoUrls: string;
  documentUrls: string;
  moduleOutline: string;
  lessonOutline: string;
  taskChecklist: string;
};

const EMPTY_FORM: CourseForm = {
  title: "",
  description: "",
  thumbnailUrl: "",
  bannerUrl: "",
  category: "product_education",
  growInterests: "",
  skillLevel: "",
  access: "free",
  price: "",
  stripeProductId: "",
  stripePriceId: "",
  linkedProductIds: "",
  linkedProductLineIds: "",
  linkedGrowIds: "",
  linkedLiveIds: "",
  linkedVideoUrls: "",
  documentUrls: "",
  moduleOutline: "",
  lessonOutline: "",
  taskChecklist: ""
};

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function feedCampaignIds(row: any) {
  return row?.linkedFeedCampaignIds || row?.linkedFeedPostIds || [];
}

function splitIds(value: string) {
  return splitList(value);
}

function courseId(course: CommercialCourse) {
  return course.id || course._id || course.title || "course";
}

function productLineId(line: ProductLine) {
  return String(line.id || line._id || line.name || "").trim();
}

function appendIdList(value: string, id: string) {
  if (!id) return value;
  const ids = splitIds(value);
  return ids.includes(id) ? ids.join(", ") : [...ids, id].join(", ");
}

function outlineItems(value: string, type: "module" | "lesson" | "task") {
  return splitList(value).map((title, index) => ({
    title,
    sortOrder: index + 1,
    status: "draft",
    ...(type === "lesson" ? { lessonType: "article" } : null),
    ...(type === "task"
      ? { sourceType: "course", priority: "normal", status: "open" }
      : null)
  }));
}

function courseSetupWarnings(course: Partial<CommercialCourse>) {
  const warnings: string[] = [];
  if (!course.thumbnailUrl?.trim()) warnings.push("add thumbnail");
  if (!course.bannerUrl?.trim()) warnings.push("add banner");
  if (!course.description?.trim()) warnings.push("add description");
  if (!course.growInterests?.length) warnings.push("add grow interests");
  if (!course.modules?.length) warnings.push("add module");
  if (!course.lessons?.length) warnings.push("add lesson");
  if (course.access === "paid") {
    if (!Number(course.price)) warnings.push("add paid price");
    if (!course.stripeProductId?.trim()) warnings.push("connect Stripe product");
    if (!course.stripePriceId?.trim()) warnings.push("connect Stripe price");
  }
  return warnings;
}

function courseThumbnailUrl(course: Partial<CommercialCourse>) {
  return resolveImageUri(course.thumbnailUrl || "");
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
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTaskForCourseId, setCreatingTaskForCourseId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<any>(null);

  const publishedCount = useMemo(
    () => courses.filter((course) => course.status === "published").length,
    [courses]
  );
  const paidCount = useMemo(
    () => courses.filter((course) => course.access === "paid").length,
    [courses]
  );
  const formWarnings = courseSetupWarnings({
    title: form.title,
    description: form.description,
    thumbnailUrl: form.thumbnailUrl,
    bannerUrl: form.bannerUrl,
    growInterests: splitList(form.growInterests),
    access: form.access,
    price: Number(form.price) || 0,
    stripeProductId: form.stripeProductId,
    stripePriceId: form.stripePriceId,
    modules: outlineItems(form.moduleOutline, "module"),
    lessons: outlineItems(form.lessonOutline, "lesson")
  });

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      const [courseResult, lineResult] = await Promise.allSettled([
        fetchCommercialCourses(),
        fetchProductLines()
      ]);
      if (courseResult.status === "rejected") throw courseResult.reason;
      setCourses(courseResult.value);
      setProductLines(lineResult.status === "fulfilled" ? lineResult.value : []);
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
      const [thumbnailUrl, bannerUrl] = await Promise.all([
        persistImageUri(form.thumbnailUrl.trim()),
        persistImageUri(form.bannerUrl.trim())
      ]);
      await createCommercialCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: thumbnailUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        category: form.category.trim() || "product_education",
        growInterests: splitList(form.growInterests),
        skillLevel: form.skillLevel.trim() || undefined,
        access: form.access,
        price: form.access === "paid" ? Number(form.price) || 0 : 0,
        stripeProductId: form.stripeProductId.trim() || undefined,
        stripePriceId: form.stripePriceId.trim() || undefined,
        linkedProductIds: splitIds(form.linkedProductIds),
        linkedProductLineIds: splitIds(form.linkedProductLineIds),
        linkedTrialIds: splitIds(form.linkedGrowIds),
        linkedGrowIds: splitIds(form.linkedGrowIds),
        linkedLiveIds: splitIds(form.linkedLiveIds),
        linkedVideoUrls: splitList(form.linkedVideoUrls),
        documentUrls: splitList(form.documentUrls),
        modules: outlineItems(form.moduleOutline, "module"),
        lessons: outlineItems(form.lessonOutline, "lesson"),
        tasks: outlineItems(form.taskChecklist, "task"),
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

  async function pickCourseImage(kind: "thumbnailUrl" | "bannerUrl") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        new Error("Photo-library permission is required to upload a course image.")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85
    });
    if (result.canceled) return;
    const uri = result.assets.find((asset) => asset.uri)?.uri;
    if (uri) setForm((prev) => ({ ...prev, [kind]: uri }));
  }

  async function createCourseSetupTask(course: CommercialCourse, warnings: string[]) {
    const id = courseId(course);
    if (!id || !warnings.length || creatingTaskForCourseId) return;
    setCreatingTaskForCourseId(String(id));
    setFeedback("");
    setError(null);
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: `Complete course setup: ${course.title || "Course"}`,
          description: `Missing setup: ${warnings.join(", ")}.`,
          sourceType: "course",
          sourceId: String(id),
          sourceObjectId: String(id),
          allDay: true,
          calendarType: "course_setup_task",
          sourceStage: "course_setup_review",
          linkedCourseId: String(id),
          growInterests: course.growInterests || [],
          linkedProductIds: course.linkedProductIds || [],
          linkedProductLineIds: course.linkedProductLineIds || [],
          linkedTrialIds: course.linkedTrialIds || course.linkedGrowIds || [],
          linkedGrowIds: course.linkedGrowIds || [],
          linkedLiveIds: course.linkedLiveIds || [],
          linkedFeedCampaignIds: feedCampaignIds(course),
          linkedFeedPostIds: feedCampaignIds(course),
          linkedForumThreadId: course.forumThreadId,
          priority: warnings.some((warning) =>
            [
              "add lesson",
              "add module",
              "add paid price",
              "connect Stripe price"
            ].includes(warning)
          )
            ? "high"
            : "normal",
          status: "open",
          dueAt: new Date().toISOString().slice(0, 10),
          reminderPlan: { label: "24 hours before", channels: ["in_app"] }
        }
      });
      setFeedback(`Created setup task for ${course.title || "course"}.`);
    } catch (err) {
      setError(err);
    } finally {
      setCreatingTaskForCourseId("");
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
            <ActionLink href="/home/commercial/courses" label="Create Course" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ActionLink href="/home/commercial/products" label="Products" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Create a course</Text>
        <Text style={styles.body}>
          All user types can create courses. Commercial courses should add storefront
          context: product use, grow methods, plant care, seasonal gardening, support, and
          customer onboarding.
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
        {feedback ? <Text style={styles.successText}>{feedback}</Text> : null}
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
        <View style={styles.formGrid}>
          <TextInput
            value={form.thumbnailUrl}
            onChangeText={(thumbnailUrl) =>
              setForm((prev) => ({ ...prev, thumbnailUrl }))
            }
            accessibilityLabel="Commercial course thumbnail URL"
            placeholder="Thumbnail image URL"
            style={styles.input}
          />
          <TextInput
            value={form.bannerUrl}
            onChangeText={(bannerUrl) => setForm((prev) => ({ ...prev, bannerUrl }))}
            accessibilityLabel="Commercial course banner URL"
            placeholder="Banner image URL"
            style={styles.input}
          />
          <TextInput
            value={form.growInterests}
            onChangeText={(growInterests) =>
              setForm((prev) => ({ ...prev, growInterests }))
            }
            accessibilityLabel="Commercial course grow interests"
            placeholder="Grow interests, comma separated"
            style={styles.input}
          />
          <TextInput
            value={form.skillLevel}
            onChangeText={(skillLevel) => setForm((prev) => ({ ...prev, skillLevel }))}
            accessibilityLabel="Commercial course skill level"
            placeholder="Skill level"
            style={styles.input}
          />
        </View>
        <TextInput
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
          accessibilityLabel="Commercial course description"
          multiline
          placeholder="What this course teaches and who it helps"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.mediaTools}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload commercial course thumbnail"
            onPress={() => pickCourseImage("thumbnailUrl")}
            disabled={saving}
            style={[styles.mediaButton, saving && styles.disabled]}
          >
            <Text style={styles.mediaButtonText}>Upload thumbnail</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload commercial course banner"
            onPress={() => pickCourseImage("bannerUrl")}
            disabled={saving}
            style={[styles.mediaButton, saving && styles.disabled]}
          >
            <Text style={styles.mediaButtonText}>Upload banner</Text>
          </Pressable>
        </View>
        {form.thumbnailUrl || form.bannerUrl ? (
          <View style={styles.previewGrid}>
            {form.thumbnailUrl ? (
              <Image
                source={{ uri: resolveImageUri(form.thumbnailUrl) }}
                style={styles.thumbnailPreview}
                resizeMode="cover"
                accessibilityLabel="Commercial course thumbnail preview"
              />
            ) : null}
            {form.bannerUrl ? (
              <Image
                source={{ uri: resolveImageUri(form.bannerUrl) }}
                style={styles.bannerPreview}
                resizeMode="cover"
                accessibilityLabel="Commercial course banner preview"
              />
            ) : null}
          </View>
        ) : null}
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
            placeholder="Linked product line IDs, or choose below"
            style={styles.input}
          />
          {productLines.length ? (
            <View style={styles.lineSelector}>
              <Text style={styles.selectorLabel}>Choose Product Line</Text>
              <View style={styles.selectorActions}>
                {productLines.slice(0, 4).map((line) => {
                  const id = productLineId(line);
                  const name = line.name || "Product line";
                  const selected = splitIds(form.linkedProductLineIds).includes(id);
                  return (
                    <Pressable
                      key={`course-line-${id || name}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Use course product line ${name}`}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          linkedProductLineIds: appendIdList(
                            prev.linkedProductLineIds,
                            id
                          )
                        }))
                      }
                      style={[styles.action, selected && styles.actionSelected]}
                    >
                      <Text style={styles.actionText}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <TextInput
            value={form.linkedGrowIds}
            onChangeText={(linkedGrowIds) =>
              setForm((prev) => ({ ...prev, linkedGrowIds }))
            }
            accessibilityLabel="Commercial course linked evidence runs"
            placeholder="Linked evidence run IDs"
            style={styles.input}
          />
          <TextInput
            value={form.linkedLiveIds}
            onChangeText={(linkedLiveIds) =>
              setForm((prev) => ({ ...prev, linkedLiveIds }))
            }
            accessibilityLabel="Commercial course linked lives"
            placeholder="Linked live IDs"
            style={styles.input}
          />
          <TextInput
            value={form.linkedVideoUrls}
            onChangeText={(linkedVideoUrls) =>
              setForm((prev) => ({ ...prev, linkedVideoUrls }))
            }
            accessibilityLabel="Commercial course linked videos"
            placeholder="Video URLs, comma or newline separated"
            style={styles.input}
          />
          <TextInput
            value={form.documentUrls}
            onChangeText={(documentUrls) =>
              setForm((prev) => ({ ...prev, documentUrls }))
            }
            accessibilityLabel="Commercial course documents"
            placeholder="Document URLs, comma or newline separated"
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
          <TextInput
            value={form.stripeProductId}
            onChangeText={(stripeProductId) =>
              setForm((prev) => ({ ...prev, stripeProductId }))
            }
            accessibilityLabel="Commercial course Stripe product ID"
            placeholder="Stripe product ID for paid course"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={form.stripePriceId}
            onChangeText={(stripePriceId) =>
              setForm((prev) => ({ ...prev, stripePriceId }))
            }
            accessibilityLabel="Commercial course Stripe price ID"
            placeholder="Stripe price ID for paid course"
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
        <TextInput
          value={form.moduleOutline}
          onChangeText={(moduleOutline) =>
            setForm((prev) => ({ ...prev, moduleOutline }))
          }
          accessibilityLabel="Commercial course module outline"
          multiline
          placeholder="Module outline, one per line"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.lessonOutline}
          onChangeText={(lessonOutline) =>
            setForm((prev) => ({ ...prev, lessonOutline }))
          }
          accessibilityLabel="Commercial course lesson outline"
          multiline
          placeholder="Lesson outline, one per line"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.taskChecklist}
          onChangeText={(taskChecklist) =>
            setForm((prev) => ({ ...prev, taskChecklist }))
          }
          accessibilityLabel="Commercial course task checklist"
          multiline
          placeholder="Course tasks/checklist, one per line"
          style={[styles.input, styles.textArea]}
        />
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
        {formWarnings.length ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Course setup checklist</Text>
            <Text style={styles.warningText}>{formWarnings.join(" | ")}</Text>
          </View>
        ) : null}
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
            {courses.map((course) =>
              (() => {
                const warnings = courseSetupWarnings(course);
                return (
                  <View key={courseId(course)} style={styles.courseRow}>
                    {courseThumbnailUrl(course) ? (
                      <Image
                        accessibilityLabel={`${course.title || "Course"} thumbnail`}
                        source={{ uri: courseThumbnailUrl(course) }}
                        style={styles.courseThumbnail}
                      />
                    ) : null}
                    <Text style={styles.courseTitle}>
                      {course.title || "Untitled course"}
                    </Text>
                    <Text style={styles.courseMeta}>
                      {[
                        course.category,
                        course.skillLevel,
                        course.access || "free",
                        course.status || "draft",
                        course.growInterests?.length
                          ? `Interests ${course.growInterests.join(", ")}`
                          : null,
                        course.linkedLiveIds?.length
                          ? `Lives ${course.linkedLiveIds.join(", ")}`
                          : null
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                    {course.modules?.length ||
                    course.lessons?.length ||
                    course.tasks?.length ? (
                      <Text style={styles.courseMeta}>
                        {[
                          course.modules?.length
                            ? `${course.modules.length} modules`
                            : null,
                          course.lessons?.length
                            ? `${course.lessons.length} lessons`
                            : null,
                          course.tasks?.length ? `${course.tasks.length} tasks` : null
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    ) : null}
                    {course.description ? (
                      <Text style={styles.courseBody}>{course.description}</Text>
                    ) : null}
                    {warnings.length ? (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>Missing course setup</Text>
                        <Text style={styles.warningText}>{warnings.join(" | ")}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Create setup task for ${course.title || "course"}`}
                          disabled={creatingTaskForCourseId === String(courseId(course))}
                          onPress={() => createCourseSetupTask(course, warnings)}
                          style={[
                            styles.action,
                            creatingTaskForCourseId === String(courseId(course))
                              ? styles.disabled
                              : null
                          ]}
                        >
                          <Text style={styles.actionText}>
                            {creatingTaskForCourseId === String(courseId(course))
                              ? "Creating..."
                              : "Create Task"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={styles.actions}>
                      <ActionLink
                        href={`/home/commercial/courses/${encodeURIComponent(courseId(course))}`}
                        label="Open Detail"
                      />
                    </View>
                  </View>
                );
              })()
            )}
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
          Use trial results and evidence reports as lesson evidence
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
  mediaTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  mediaButton: {
    backgroundColor: "#111827",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10
  },
  thumbnailPreview: {
    aspectRatio: 4 / 3,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    flexGrow: 1,
    minWidth: 180
  },
  bannerPreview: {
    aspectRatio: 16 / 7,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    flexGrow: 2,
    minWidth: 240
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
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
  lineSelector: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    marginTop: 8,
    minWidth: 220,
    padding: 9
  },
  selectorLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  selectorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  warningBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    padding: 10
  },
  warningTitle: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  warningText: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  successText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  courseThumbnail: {
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    height: 120,
    marginBottom: 10,
    width: "100%"
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
