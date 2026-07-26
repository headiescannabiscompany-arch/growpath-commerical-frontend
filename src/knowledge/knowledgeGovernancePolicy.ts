export const knowledgeGovernancePolicy = {
  sourceDraftRequiredFields: [
    "entryId",
    "title",
    "domainOrPreferredAuthor",
    "reliabilityTier",
    "trustedFor",
    "notTrustedFor",
    "crossCheckRequirements",
    "reviewDueAt",
    "changeNote"
  ] as const,
  minimumMethodOutcomeRecords: 3,
  excludesSyntheticOutcomes: true,
  approvalEffect: "editorial_review_only",
  runtimeChangeRequiresReviewedCodeRelease: true
} as const;
