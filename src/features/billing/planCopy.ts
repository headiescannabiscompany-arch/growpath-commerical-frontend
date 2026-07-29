import { PLAN_PRICING } from "../../constants/pricing";

export type BillingPlanKey = "pro" | "commercial" | "facility";

export type BillingPlanCopy = {
  key: BillingPlanKey;
  title: string;
  eyebrow: string;
  audience: string;
  description: string;
  billingNext: string;
  details: string[];
  bullets: string[];
};

export const BILLING_PLANS: BillingPlanCopy[] = [
  {
    key: "pro",
    title: PLAN_PRICING.pro.title,
    eyebrow: PLAN_PRICING.pro.eyebrow,
    audience:
      "Solo growers and personal accounts that want AI guidance, diagnosis, planning, exports, and saved run history without storefront or facility admin overhead.",
    description:
      "For an individual grower account that needs AI guidance, diagnosis, planning, exports, and the stronger personal toolset without brand or facility admin overhead.",
    billingNext:
      "Stripe opens with Pro selected and the chosen monthly or yearly interval. Payment is collected there.",
    details: [
      "Best for one grower managing a personal grow or a small private set of plants.",
      "Keeps AI diagnosis, planning, and review in one personal workspace.",
      "Supports saved runs and exports so you can compare results over time."
    ],
    bullets: [
      "AI diagnosis, planning, and review workflows",
      "Advanced calculators and grow exports",
      "Personal account tools and saved run history"
    ]
  },
  {
    key: "commercial",
    title: PLAN_PRICING.commercial.title,
    eyebrow: PLAN_PRICING.commercial.eyebrow,
    audience:
      "Brands, sellers, and educators that need storefronts, products, courses, lives, orders, analytics, and discovery surfaces.",
    description:
      "For a public brand or seller that needs storefronts, products, campaigns, courses, lives, orders, analytics, and the discovery surfaces that connect the whole brand workflow.",
    billingNext:
      "Stripe opens with Commercial selected and the chosen monthly or yearly interval. Payment is collected there.",
    details: [
      "Best for brands that need storefronts, product pages, and public discovery surfaces.",
      "Supports courses, lives, campaigns, orders, and analytics in one workflow.",
      "Helps customers move from discovery to product, education, or pickup."
    ],
    bullets: [
      "Storefront, products, and public brand pages",
      "Courses, lives, and campaign publishing",
      "Orders, analytics, and discovery reach"
    ]
  },
  {
    key: "facility",
    title: PLAN_PRICING.facility.title,
    eyebrow: PLAN_PRICING.facility.eyebrow,
    audience:
      "Multi-user operators that need rooms, tasks, SOPs, compliance, and team controls.",
    description:
      "For a multi-user operation that needs rooms, tasks, SOPs, audit evidence, compliance exports, and team coordination with stronger operational controls.",
    billingNext:
      "Stripe opens with Facility selected and the chosen monthly or yearly interval. Payment is collected there.",
    details: [
      "Best for shared operations across rooms, tasks, and compliance work.",
      "Supports SOPs, audit evidence, assignments, and operational records.",
      "Keeps managers, staff, and reviewers on the same workflow with tighter controls."
    ],
    bullets: [
      "Rooms, tasks, and team coordination",
      "SOPs, audit evidence, and compliance exports",
      "Multi-user operational workflows"
    ]
  }
];
