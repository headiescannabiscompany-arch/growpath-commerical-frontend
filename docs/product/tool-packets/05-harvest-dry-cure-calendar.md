# Packet 5 — Harvest Readiness AI, Dry / Cure Guard, Auto Grow Calendar

## Product Intent

Build the timing and finish system:

```txt
Auto Grow Calendar -> harvest readiness -> harvest batch -> dry/cure guard -> logs/tasks/timeline -> future AI/genetics context
```

## Core Rule

Breeder flowering time is a reference, not a command.

Harvest readiness uses:

- breeder time
- flower day
- pistils/hairs
- bud/calyx swell
- clear/cloudy/amber trichomes
- smell/aroma development
- plant fade
- user effect goal
- pheno behavior
- photos/video if available

## Auto Grow Calendar

Inputs:

- start date
- plant count
- planned veg weeks
- flip date
- cultivar flower ranges
- medium/grow style

Outputs:

- stage timeline
- plant-specific harvest windows
- generated tasks
- reminders
- warnings

Do not generate one exact harvest date. Use ranges.

## Harvest Readiness AI

Statuses:

- too early
- approaching window
- in window
- late window
- uneven
- uncertain

Warnings:

- do not harvest from one sugar leaf photo
- tops can mature before lowers
- some phenos amber slowly
- new white hairs can mean growth, stress, or reflowering
- smell/flavor matters

## Dry / Cure Guard

Not a 60/60 purity test.

Rule:

```txt
60°F/60% RH is a common target, not the only path.
Above 68°F can still produce good flower if RH, airflow, dry speed, density, and jar moisture are managed.
```

Inputs:

- dry room temp/RH
- dew point
- airflow
- days drying
- bud density
- stem snap
- jar RH
- cure day
- smell/mold/overdry concerns

Outputs:

- mold risk
- overdry risk
- dry/cure status
- next action
- tasks
- realistic notes

## Acceptance

Complete when users can generate calendar plans, run harvest readiness checks, create harvest batches, log dry/cure checks, create jar/burp/mold tasks, save/reload records, enforce ownership, and timeline all major events.
