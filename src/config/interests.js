export const INTEREST_TIERS = [
  {
    id: "crops",
    label: "What You Grow",
    tier: 1,
    options: [
      "Cannabis",
      "Vegetables",
      "Herbs",
      "Fruit Trees & Bushes",
      "Houseplants",
      "Succulents & Cacti",
      "Flowers / Ornamentals",
      "Microgreens",
      "Mushrooms"
    ]
  },
  {
    id: "environment",
    label: "Environment",
    tier: 2,
    options: [
      "Indoor",
      "Outdoor",
      "Greenhouse",
      "Containers / Pots",
      "Raised Beds",
      "In-Ground",
      "Vertical Growing"
    ]
  },
  {
    id: "methods",
    label: "Growing Method",
    tier: 3,
    options: [
      "Living Soil / No-Till",
      "Organic (Amended Soil)",
      "Synthetic / Salt Nutrients",
      "Hydroponics",
      "Aeroponics",
      "Aquaponics",
      "Coco Coir",
      "Soilless Mixes"
    ]
  },
  {
    id: "techniques",
    label: "Training & Techniques",
    tier: 4,
    options: [
      "Low Stress Training (LST)",
      "High Stress Training (HST)",
      "Topping",
      "FIM",
      "Mainlining / Manifolding",
      "SCROG",
      "SOG",
      "Supercropping",
      "Defoliation",
      "Lollipopping",
      "Cloning",
      "Seed Starting",
      "Breeding / Seed Making",
      "Feminization",
      "Tissue Culture"
    ]
  },
  {
    id: "goals",
    label: "Goals",
    tier: 5,
    options: [
      "Yield-Focused",
      "Quality / Flavor-Focused",
      "Terpene Optimization",
      "Medicinal Compounds",
      "Speed / Fast Turnover",
      "Bag Appeal",
      "Stability / Consistency"
    ]
  },
  {
    id: "constraints",
    label: "Constraints",
    tier: 6,
    options: [
      "Low Budget",
      "Small Space",
      "Stealth / Odor Control",
      "Sustainable / Regenerative",
      "Water-Efficient",
      "Minimal Inputs",
      "Automation / Hands-Off"
    ]
  },
  {
    id: "experience",
    label: "Experience Level",
    tier: 7,
    options: [
      "Beginner",
      "Intermediate",
      "Advanced",
      "Experimental / R&D"
    ]
  }
];

export function getAllTags() {
  const all = [];
  INTEREST_TIERS.forEach(tier => {
    all.push(...tier.options);
  });
  return all;
}
