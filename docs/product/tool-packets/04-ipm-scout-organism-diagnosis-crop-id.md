# Packet 4 — IPM Scout, Organism Library, Diagnosis Rules, Species/Crop ID

## Product Intent

Build a cautious plant diagnosis and IPM system:

```txt
Crop ID -> user confirmation -> IPM Scout observation -> local rule/library result -> GPT/OpenAI verification -> user decision -> log/task/timeline -> outcome tracking
```

No fake certainty. No reckless pesticide dosing. No invasive/reportable claims without verified regional data.

## ETGU Diagnosis Rule

```txt
Read the pattern.
Read the medium.
Read the environment.
Read the numbers.
Then name likely causes.
```

For IPM:

```txt
Identify crop -> read damage -> inspect plant -> inspect environment -> look for organisms/evidence -> cross-check AI -> document confidence -> next checks -> track outcome
```

## Species/Crop ID

Simple version:

- user enters plant name or uploads media
- system suggests likely crop/species
- user confirms or corrects
- confirmed crop identity feeds diagnosis, nutrient, environment, and IPM tools

Do not use one photo as authoritative.

## Required Records

- `CropProfile`
- `PlantTaxon`
- `DiagnosisRule`
- `OrganismProfile`
- `IPMScoutRecord`
- `IPMOutcomeUpdate`

## IPM Scout

Inputs include plant/crop, photos/video, observation location, observed signs, trap counts, underside inspection, magnification, environment, notes.

Outputs include suspected issues, category, organism, confidence, evidence, counter-evidence, severity, contributing conditions, next checks, treatment category, local result, AI verification, agreement status, user decision, tags, tasks, disclaimer.

Treatment categories only:

- monitor
- isolate
- remove damaged material
- improve airflow
- reduce leaf wetness
- sanitation
- sticky traps
- biological control
- mechanical removal
- consult label/extension
- professional testing

No pesticide dosing.

## AI Verification

Send the same structured observation and local result to GPT/OpenAI when configured. Show both answers:

- GrowPathAI local rule/library result
- AI verification result
- agreement: agrees, partially agrees, conflicts, insufficient data

Save both, plus user decision and outcome updates.

## Acceptance

Complete when crop ID requires confirmation, IPM Scout saves records, local and AI results are shown, user can accept/reject/uncertain, tasks/log/timeline are created, outcome tracking exists, organism library has source confidence, and no pesticide dosing or fake certainty is emitted.
