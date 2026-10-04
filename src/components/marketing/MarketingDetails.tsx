import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import marketing from "./publicMarketing.json";

export const PLAN_COMPARISON_ROWS = [
  { title: "Tracked grows", key: "grows" },
  { title: "Tracked plants", key: "plants" },
  { title: "AI credits per week", key: "credits" },
  { title: "Published paid courses", key: "paidCourses" },
  { title: "Lessons per course", key: "lessons" }
] as const;

export function FounderPortrait() {
  const { photo, photoAlt } = marketing.founder;
  if (!photo || !photoAlt) return null;
  return (
    <Image
      source={{
        uri: Platform.OS === "web" ? photo : new URL(photo, "https://growpathai.com").href
      }}
      alt={photoAlt}
      accessibilityLabel={photoAlt}
      style={{ width: 192, height: 240, maxWidth: "100%" }}
      resizeMode="contain"
    />
  );
}

export default function MarketingDetails({ page }: { page: string }) {
  const { palette } = useAppTheme();
  const text = { color: palette.textMuted, fontSize: 16, lineHeight: 25 };
  const heading = { color: palette.text, fontSize: 23, fontWeight: "800" as const };
  const card = { backgroundColor: palette.card, padding: 22, borderRadius: 18, gap: 12 };
  return (
    <View style={{ gap: 24 }}>
      {page === "pricing" && (
        <>
          <View style={card}>
            <Text accessibilityRole="header" aria-level={2} style={heading}>
              Compare plan allowances
            </Text>
            <Text style={text}>
              Standard plan limits. Facility AI credits are shared by its workspace.
              Individual grants or trials can differ; your account shows your current
              allowance.
            </Text>
            {Platform.OS === "web" ? (
              <div
                role="region"
                aria-label="Plan comparison, scroll horizontally on small screens"
                tabIndex={0}
                style={{ overflowX: "auto", maxWidth: "100%", color: palette.text }}
              >
                <table
                  style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}
                >
                  <caption style={{ textAlign: "left", padding: 12 }}>
                    Choose by the work you need to do
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: "left", padding: 12 }}>
                        Allowance
                      </th>
                      {marketing.plans.map((p) => (
                        <th
                          scope="col"
                          style={{ textAlign: "left", padding: 12 }}
                          key={p.id}
                        >
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON_ROWS.map((row) => (
                      <tr key={row.key}>
                        <th
                          scope="row"
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderTop: "1px solid " + palette.border
                          }}
                        >
                          {row.title}
                        </th>
                        {marketing.plans.map((p) => (
                          <td
                            style={{
                              padding: 12,
                              borderTop: "1px solid " + palette.border
                            }}
                            key={p.id}
                          >
                            {p[row.key].toLocaleString("en-US")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              marketing.plans.map((p) => (
                <View key={p.id} style={{ gap: 6 }}>
                  <Text style={heading}>{p.name}</Text>
                  {PLAN_COMPARISON_ROWS.map((row) => (
                    <Text style={text} key={row.key}>
                      {row.title}: {p[row.key]}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>
          <View style={card}>
            <Text accessibilityRole="header" aria-level={2} style={heading}>
              Before you choose a plan
            </Text>
            {marketing.pricingFaq.map((faq) => (
              <View key={faq.title} style={{ gap: 8, paddingVertical: 10 }}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={{ ...heading, fontSize: 18 }}
                >
                  {faq.title}
                </Text>
                <Text style={text}>{faq.body}</Text>
              </View>
            ))}
            <Link href="/terms" style={{ color: palette.link }}>
              Read Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: palette.link }}>
              Read Privacy Policy
            </Link>
          </View>
        </>
      )}
      {(page === "home" || page === "personal-grower") && (
        <View style={card}>
          <Text accessibilityRole="header" aria-level={2} style={heading}>
            Your records, your decisions
          </Text>
          <Text style={text}>{marketing.scope}</Text>
          <Link href="/pricing" style={{ color: palette.link }}>
            See exact limits, exports, and data-ownership answers
          </Link>
        </View>
      )}
      {page === "home" && marketing.founder.homeMention && (
        <View style={card}>
          <Text style={text}>{marketing.founder.homeMention}</Text>
          <Link href={marketing.founder.showUrl as never} style={{ color: palette.link }}>
            Watch the show on YouTube
          </Link>
        </View>
      )}
      {page === "about" && (
        <View style={card}>
          <Text accessibilityRole="header" aria-level={2} style={heading}>
            {marketing.founder.historyTitle}
          </Text>
          <Text style={text}>{marketing.founder.historyNote}</Text>
          {marketing.founder.historySections.map((section) => (
            <View key={section.title} style={{ gap: 8 }}>
              <Text
                accessibilityRole="header"
                aria-level={3}
                style={{ ...heading, fontSize: 19 }}
              >
                {section.title}
              </Text>
              <Text style={text}>{section.body}</Text>
            </View>
          ))}
        </View>
      )}
      {(page === "home" || page === "about") && (
        <View style={card}>
          <Text accessibilityRole="header" aria-level={2} style={heading}>
            See what has actually shipped
          </Text>
          <Text style={text}>
            Our Updates page separates live releases from work still in progress. Read the
            dated release notes before counting on a feature.
          </Text>
          <Link href="/updates" style={{ color: palette.link }}>
            Read product updates
          </Link>
        </View>
      )}
    </View>
  );
}
