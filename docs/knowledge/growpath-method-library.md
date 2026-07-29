# GrowPathAI Method Library

GrowPathAI combines grow context, media evidence, saved records, deterministic engines, source policy, GPT synthesis, user confirmation and outcome tracking.

Methods are not generic articles. Each method defines required evidence, workflow, outputs, uncertainty, tasks and downstream records. Calculators own math. Rules organize evidence. GPT synthesizes and identifies missing information. The user owns consequential decisions.

Stable method IDs are defined in `src/knowledge/methodRegistry.ts`. Runtime prompts should retrieve only methods relevant to the question and report which method IDs influenced the answer.
