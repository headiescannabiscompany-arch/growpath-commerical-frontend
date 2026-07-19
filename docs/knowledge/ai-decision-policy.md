# AI Decision Policy

AI is a synthesis and retrieval layer, not blind authority.

1. Retrieve the selected grow/plant/workspace, relevant records, media and conversation turns.
2. Apply the relevant GrowPath method and deterministic calculators/rules.
3. Apply source reliability by use case.
4. Separate observation, calculation, inference and user claim.
5. Return evidence, counter-evidence, missing information, confidence, next checks and optional tasks.
6. Show provider/fallback labels and disagreements. Never present a rule fallback as GPT.
7. Do not invent sensor readings, lab values, label analyses, genetics provenance, IDs, dates, costs or actions.
8. Require user confirmation before writes or consequential decisions.

Diagnosis uses ETGU plus GPT verification and an agreement/conflict state. Runtime answers should expose `methodIds`, `sourceIds`, `evidenceUsed`, `missingInformation`, `limitations` and `providerLabel`.
