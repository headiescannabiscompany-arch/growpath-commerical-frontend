import React from "react";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export type PublicPageKey =
  | "home"
  | "features"
  | "pricing"
  | "personal-grower"
  | "commercial-cultivation"
  | "facility-management"
  | "nurseries-breeders"
  | "grow-stores"
  | "creators-educators"
  | "about"
  | "contact"
  | "ai-cultivation-disclaimer";

type PageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
};

export const PUBLIC_PAGE_COPY: Record<PublicPageKey, PageCopy> = {
  home: {
    eyebrow: "Grow planning, learning, and operations",
    title: "One connected path from grow setup to harvest",
    intro:
      "GrowPathAI helps personal growers, commercial teams, facilities, stores, and educators plan work, document results, and use cultivation tools in context.",
    sections: [
      {
        title: "Personal growers",
        body: "Build grows, manage plants, schedule tasks, keep a journal, review photos, and ask AI with the grow context already attached."
      },
      {
        title: "Commercial creators",
        body: "Publish storefronts, eligible products, courses, live sessions, and community content without mixing business tools into cultivation records."
      },
      {
        title: "Facilities",
        body: "Work through Facility → Room → Grow → Plant with roles, tasks, SOPs, inventory, environmental imports, audit history, and team accountability."
      }
    ]
  },
  features: {
    eyebrow: "Connected workflows",
    title: "Tools appear where the work happens",
    intro:
      "The Tools page is a library. GrowPathAI also launches the same tools from grows, plants, logs, tasks, photos, harvests, courses, and facility workspaces.",
    sections: [
      {
        title: "Plan and schedule",
        body: "Start-a-grow planning, grow calendars, watering, feeding, timelines, and recurring tasks create real work items."
      },
      {
        title: "Observe and diagnose",
        body: "Journal entries, photos, environmental history, plant diagnosis, IPM review, and harvest-readiness results stay connected to the grow timeline."
      },
      {
        title: "Learn and share",
        body: "Courses, live sessions, forums, feeds, and public creator pages connect education with documented grow workflows."
      }
    ]
  },
  pricing: {
    eyebrow: "Plans and access",
    title: "Start free and keep what you create",
    intro:
      "All GrowPathAI users can create and publish free or paid courses, including users on the Free plan. Paid plans add higher limits and advanced workspace features.",
    sections: [
      {
        title: "Free",
        body: "Use core grow workflows, limited AI assistance, and community features. All plans can create and publish courses within their plan limits."
      },
      {
        title: "Pro Grower — $10/month or $100/year",
        body: "Advanced personal grow tools, higher AI limits, exports, and creator features. Annual billing is charged as one $100 payment."
      },
      {
        title: "Commercial — $50/month or $500/year",
        body: "Brand, product, course, storefront, campaign, inventory, and trial workflows. Annual billing is charged as one $500 payment."
      },
      {
        title: "Facility — $100/month or $1,000/year",
        body: "Rooms, teams, SOPs, inventory, environmental context, audit history, and operational reporting. Annual billing is charged as one $1,000 payment."
      }
    ]
  },
  "personal-grower": {
    eyebrow: "For personal growers",
    title: "A grow journal that helps decide what comes next",
    intro:
      "Choose grow interests, create indoor or outdoor grows, and keep plants, tasks, photos, tools, and results in one timeline.",
    sections: [
      {
        title: "Grow your way",
        body: "Support for tents, rooms, greenhouses, containers, raised beds, hydroponics, living soil, fruit trees, vegetables, flowers, and other selected interests."
      },
      {
        title: "Context-aware help",
        body: "Ask AI from a grow, plant, log, task, or photo so the relevant stage and recent history can travel with the question."
      },
      {
        title: "Keep a useful record",
        body: "Turn recommendations into tasks, complete work into journal events, and export timelines and reports."
      }
    ]
  },
  "commercial-cultivation": {
    eyebrow: "For commercial operators",
    title: "Cultivation evidence with business context",
    intro:
      "Run commercial grows with the same contextual tools as Pro, then connect trials, product lines, inventory, courses, storefront content, and analytics.",
    sections: [
      {
        title: "Trials and formulas",
        body: "Link recipes, batches, grow trials, evidence runs, and final results instead of leaving them in disconnected calculators."
      },
      {
        title: "Eligible commerce",
        body: "Publish lawful products and education. Cannabis sales are not processed through ordinary public storefronts."
      },
      {
        title: "Audience workflows",
        body: "Connect feeds, forums, courses, live sessions, creator pages, and approved product education."
      }
    ]
  },
  "facility-management": {
    eyebrow: "For cultivation facilities",
    title: "Facility → Room → Grow → Plant",
    intro:
      "Facility work stays organized around the cultivation hierarchy while facility-wide tasks, inventory, SOPs, integrations, team controls, and reports remain easy to reach.",
    sections: [
      {
        title: "Roles that match responsibility",
        body: "Owners, managers, staff, and viewers receive server-enforced access appropriate to their work."
      },
      {
        title: "Operational records",
        body: "Assign recurring work, run SOP checklists, record inventory usage, and preserve completion and audit history."
      },
      {
        title: "Environmental context",
        body: "Map supported integrations or import controller history, then analyze readings inside the applicable room and grow."
      }
    ]
  },
  "nurseries-breeders": {
    eyebrow: "For nurseries and breeders",
    title: "Track plants, propagation, and selection decisions",
    intro:
      "Connect mother plants, clones, tissue culture, genetics notes, pheno scores, stress tests, and harvest outcomes to the grows that produced the evidence.",
    sections: [
      {
        title: "Propagation",
        body: "Plan clone and tissue-culture checks, assign work, attach photos, and document results."
      },
      {
        title: "Selection",
        body: "Compare phenotypes, crop steering, stress response, final product scores, and run-to-run performance."
      },
      {
        title: "Education and profiles",
        body: "Share approved genetics education through courses, discussions, and public commercial profiles."
      }
    ]
  },
  "grow-stores": {
    eyebrow: "For grow stores",
    title: "Products, education, and community in one public presence",
    intro:
      "Build a storefront for eligible products, publish courses and live education, and connect helpful content to community conversations.",
    sections: [
      {
        title: "Storefront",
        body: "Organize product lines, product pages, links, inventory context, and public brand information."
      },
      {
        title: "Education",
        body: "Turn product knowledge into courses, live sessions, and reusable grow guidance."
      },
      {
        title: "Responsible publishing",
        body: "Moderation and product rules help keep prohibited sales language and inappropriate content out of public spaces."
      }
    ]
  },
  "creators-educators": {
    eyebrow: "For creators and educators",
    title: "Publish courses on every plan",
    intro:
      "All users can create and publish free or paid courses. Paid plans add higher limits and advanced creator tools.",
    sections: [
      {
        title: "Build from real work",
        body: "Use grow timelines, logs, photos, recipes, tool results, and forum answers as course source material."
      },
      {
        title: "Teach live",
        body: "Schedule live sessions, add stream links, notify learners, and place sessions on calendars."
      },
      {
        title: "Grow an audience",
        body: "Connect courses, live sessions, community answers, and public creator pages in one learning experience."
      }
    ]
  },
  about: {
    eyebrow: "About GrowPathAI",
    title: "Software for clearer cultivation decisions",
    intro:
      "GrowPathAI is designed to connect planning, observation, analysis, work, learning, and documentation without forcing users to hunt through disconnected tools.",
    sections: [
      {
        title: "One shared engine",
        body: "Contextual tool launches create reusable results that can feed logs, tasks, timelines, reports, and lessons."
      },
      {
        title: "Many grow types",
        body: "Recommendations and discovery follow user grow interests instead of assuming every grow is the same crop or environment."
      },
      {
        title: "Human decisions",
        body: "AI assists with questions and structured analysis; users remain responsible for reviewing information and choosing actions."
      }
    ]
  },
  contact: {
    eyebrow: "Contact and support",
    title: "Reach the GrowPathAI team",
    intro:
      "Email support@growpathai.com for account help, creator-trial applications, billing questions, facility onboarding, partnerships, or bug reports.",
    sections: [
      {
        title: "Support requests",
        body: "Include your GrowPathAI account email, workspace type, page, what you expected, and what happened."
      },
      {
        title: "Creator applications",
        body: "Include your name, account email, channel information, social links, requested account type, and what you plan to test."
      },
      {
        title: "Security and safety",
        body: "Do not send passwords, controller credentials, payment details, or sensitive evidence through ordinary support messages."
      }
    ]
  },
  "ai-cultivation-disclaimer": {
    eyebrow: "AI and cultivation disclaimer",
    title: "AI is decision support, not a guarantee",
    intro:
      "GrowPathAI can organize context, calculate values, identify patterns, and suggest questions or next steps. Its output may be incomplete or wrong and must be reviewed.",
    sections: [
      {
        title: "Cultivation",
        body: "Confirm diagnoses and treatments using direct observation, labels, trusted references, testing, and qualified local professionals."
      },
      {
        title: "Safety and compliance",
        body: "Follow product labels, workplace procedures, local laws, licensing rules, and environmental and food-safety requirements."
      },
      {
        title: "Privacy",
        body: "Avoid entering secrets or unnecessary personal information. Review what grow, plant, photo, and account context is attached before submitting."
      }
    ]
  }
};

export default function PublicLandingPage({ page }: { page: PublicPageKey }) {
  const copy = PUBLIC_PAGE_COPY[page];
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Link href="/" style={styles.brand}>
          GrowPathAI
        </Link>
        <View style={styles.navLinks}>
          <Link href="/features" style={styles.link}>
            Features
          </Link>
          <Link href="/pricing" style={styles.link}>
            Pricing
          </Link>
          <Link href="/courses" style={styles.link}>
            Courses
          </Link>
          <Link href="/forum" style={styles.link}>
            Forum
          </Link>
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        <Text style={styles.intro}>{copy.intro}</Text>
        <View style={styles.actions}>
          <Link href="/register" style={styles.primary}>
            Create free account
          </Link>
          <Link href="/features" style={styles.secondary}>
            Explore features
          </Link>
        </View>
      </View>
      <View style={styles.grid}>
        {copy.sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              {section.title}
            </Text>
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Link href="/about" style={styles.link}>
          About
        </Link>
        <Link href="/contact" style={styles.link}>
          Contact
        </Link>
        <Link href="/privacy" style={styles.link}>
          Privacy
        </Link>
        <Link href="/terms" style={styles.link}>
          Terms
        </Link>
        <Link href="/ai-cultivation-disclaimer" style={styles.link}>
          AI disclaimer
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f8f4" },
  content: { width: "100%", maxWidth: 1120, alignSelf: "center", padding: 24, gap: 28 },
  nav: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  brand: {
    color: "#173f2a",
    fontSize: 22,
    fontWeight: "900",
    textDecorationLine: "none"
  },
  navLinks: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  link: { color: "#285d3d", fontWeight: "700", textDecorationLine: "none" },
  hero: { backgroundColor: "#e1eee2", borderRadius: 24, padding: 32, gap: 14 },
  eyebrow: {
    color: "#2f6b45",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  title: {
    color: "#123221",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    maxWidth: 820
  },
  intro: { color: "#294636", fontSize: 19, lineHeight: 29, maxWidth: 840 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  primary: {
    backgroundColor: "#1f6a3b",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    fontWeight: "800",
    textDecorationLine: "none"
  },
  secondary: {
    borderColor: "#1f6a3b",
    borderWidth: 1,
    color: "#1f6a3b",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    fontWeight: "800",
    textDecorationLine: "none"
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    flexGrow: 1,
    flexBasis: 280,
    backgroundColor: "#fff",
    borderColor: "#d8e3d8",
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 9
  },
  cardTitle: { color: "#173f2a", fontSize: 20, fontWeight: "800" },
  cardBody: { color: "#44564a", fontSize: 16, lineHeight: 24 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    borderTopColor: "#d8e3d8",
    borderTopWidth: 1,
    paddingVertical: 22
  }
});
