import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import { encodeGiftSellerFacts, parseGiftSellerFacts, giftFactLabels, giftCourseTaxCategories, giftCourseDeliveryLabel, giftTaxInclusivePriceStatement, type GiftSellerFacts, type GiftCourseTaxCategory } from "@/utils/courseGiftSellerFacts";

export function CourseGiftSellerFactsReview({ value }: { value: string }) {
  const { palette } = useAppTheme();
  const facts = parseGiftSellerFacts(value);
  if (!facts) return null;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: palette.text, fontWeight: "700" }}>Seller-provided course information</Text>
    {[
      `Seller: ${facts.sellerName}`, `Business / geographic address: ${facts.sellerAddress}`,
      `Email: ${facts.sellerEmail}`, `Telephone: ${facts.sellerPhone}`,
      giftFactLabels[facts.sellerRole], `Delivery: ${giftCourseDeliveryLabel(facts)}`,
      `Learner support: ${giftFactLabels[facts.supportFormat]}`, `Assessment: ${giftFactLabels[facts.assessment]}`,
      `Access and schedule: ${facts.accessSummary}`
    ].map((line, index) => <Text key={index} style={{ color: palette.text }}>{line}</Text>)}
    {facts.version === "course-gift-seller-facts-v2" && <Text style={{ color: palette.text }}>{giftTaxInclusivePriceStatement}</Text>}
    <Text style={{ color: palette.textMuted }}>Provided by the creator. This is not a verification of legal identity or a decision about tax or consumer rights. GrowPathAI receives course-withdrawal notices for this seller at /course-withdrawal or support@growpathai.com.</Text>
  </View>;
}

type Draft = Omit<GiftSellerFacts, "version" | "publishToBuyers" | "receiveWithdrawals" | "sellerRole" | "deliveryFormat" | "supportFormat" | "assessment"> & {
  sellerRole: GiftSellerFacts["sellerRole"] | "";
  courseTaxCategory: GiftCourseTaxCategory | "";
  supportFormat: GiftSellerFacts["supportFormat"] | "";
  assessment: GiftSellerFacts["assessment"] | "";
};
export function CourseGiftSellerFactsForm({ savedValue, disabled, onEdit, onReview }: {
  savedValue?: string; disabled: boolean; onEdit: () => void; onReview: (value: string) => void;
}) {
  const { palette } = useAppTheme();
  const [draft, setDraft] = useState<Draft>(() => {
    const old = parseGiftSellerFacts(savedValue);
    return {
      sellerName: old?.sellerName || "", sellerAddress: old?.sellerAddress || "",
      sellerEmail: old?.sellerEmail || "", sellerPhone: old?.sellerPhone || "",
      sellerRole: old?.sellerRole || "", supportFormat: old?.supportFormat || "",
      assessment: old?.assessment || "", accessSummary: old?.accessSummary || "",
      courseTaxCategory: old?.version === "course-gift-seller-facts-v2" ? old.courseTaxCategory : ""
    };
  });
  // Saved declarations never pre-check renewed disclosure/agency authority.
  const [publication, setPublication] = useState(false);
  const [agency, setAgency] = useState(false);
  const change = (key: keyof Draft, value: string) => {
    setDraft(old => ({ ...old, [key]: value })); setPublication(false); setAgency(false); onEdit();
  };
  const fields: [keyof Draft, string, number, boolean][] = [
    ["sellerName", "Legal seller name and any trading name", 200, false],
    ["sellerAddress", "Business / geographic postal address, including country (shown to buyers)", 600, true],
    ["sellerEmail", "Seller contact email (shown to buyers)", 320, false],
    ["sellerPhone", "Seller contact telephone, including country code (shown to buyers)", 60, false],
    ["accessSummary", "Course access duration, start / delivery schedule and support commitments", 1000, true]
  ];
  const choices: [keyof Draft, string, string[]][] = [
    ["sellerRole", "Seller status", ["trader", "private"]],
    ["courseTaxCategory", "Course delivery", Object.keys(giftCourseTaxCategories)],
    ["supportFormat", "Learner support / instructor Q&A", ["none", "group", "individual", "both"]],
    ["assessment", "Assignments / assessment", ["none", "automated", "instructor"]]
  ];
  const value = encodeGiftSellerFacts({ ...draft, version: "course-gift-seller-facts-v2",
    deliveryFormat: draft.courseTaxCategory ? giftCourseTaxCategories[draft.courseTaxCategory].deliveryFormat : "",
    listedPriceTaxBehavior: "inclusive", sellerEmail: draft.sellerEmail.trim().toLowerCase(), publishToBuyers: true, receiveWithdrawals: true } as GiftSellerFacts);
  const choiceLabel = (option: string) => Object.hasOwn(giftCourseTaxCategories, option)
    ? giftCourseTaxCategories[option as GiftCourseTaxCategory].label : giftFactLabels[option as keyof typeof giftFactLabels];
  const check = (label: string, checked: boolean, update: (value: boolean) => void) => <Pressable
    accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }}
    disabled={disabled} onPress={() => { update(!checked); onEdit(); }}
    style={{ padding: 14, borderWidth: 1, borderRadius: 8, borderColor: palette.border }}>
    <Text style={{ color: palette.text }}>{checked ? "[x]" : "[ ]"} {label}</Text>
  </Pressable>;
  return <View style={{ gap: 12 }}>
    <Text style={{ color: palette.text, fontWeight: "700" }}>Seller and course details for buyers</Text>
    <Text style={{ color: palette.textMuted }}>Enter your actual current seller details, including a sole-proprietor name where applicable. Do not enter a planned company as if it already exists. Use a business contact address you can disclose; do not enter tax IDs, bank details or identity documents. Drafts stay on this page and are not saved in browser recovery storage.</Text>
    {fields.map(([key, label, maxLength, multiline]) => <View key={key} style={{ gap: 6 }}>
      <Text style={{ color: palette.text }}>{label}</Text>
      <TextInput accessibilityLabel={label} value={draft[key]} editable={!disabled} maxLength={maxLength} multiline={multiline}
        autoCapitalize={key === "sellerEmail" ? "none" : "sentences"} autoCorrect={key !== "sellerEmail"} autoComplete="off"
        onChangeText={v => change(key, v)} style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 8, padding: 12, minHeight: multiline ? 96 : 48 }} />
    </View>)}
    {choices.map(([key, label, options]) => <View key={key} style={{ gap: 6 }}>
      <Text style={{ color: palette.text }}>{label}</Text>
      {options.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`${label}: ${choiceLabel(option)}`}
        accessibilityState={{ checked: draft[key] === option, disabled }} disabled={disabled}
        onPress={() => change(key, option)} style={{ padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8 }}>
        <Text style={{ color: palette.text }}>{draft[key] === option ? "●" : "○"} {choiceLabel(option)}</Text>
      </Pressable>)}
    </View>)}
    <Text style={{ color: palette.text }}>{giftTaxInclusivePriceStatement}</Text>
    <Text style={{ color: palette.textMuted }}>Choose the format actually included in this course. Mixed formats, replays, instructor support or uncertain treatment may require review before sales. A format choice does not establish a tax exemption or registration.</Text>
    <Text style={{ color: palette.textMuted }}>Selecting a private sale does not waive mandatory customer rights or decide the seller's legal or tax status. Gifting readiness is checked separately.</Text>
    {check("I authorize these seller and course details to be shown to prospective buyers and retained with their transaction evidence.", publication, setPublication)}
    {check("I appoint GrowPathAI to receive and timestamp withdrawal notices for this course on my behalf. I remain responsible for required remedies and deadlines.", agency, setAgency)}
    <PrimaryButton title="Review seller and course details" disabled={disabled || !publication || !agency || !parseGiftSellerFacts(value)} onPress={() => onReview(value)} />
  </View>;
}
