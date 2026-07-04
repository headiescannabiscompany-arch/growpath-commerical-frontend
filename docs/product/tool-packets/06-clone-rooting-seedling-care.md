# Packet 6 — Clone Rooting, Seedling Care, Clone Room Troubleshooter

## Product Intent

Clone rooting is propagation data, not a random yes/no tool.

It connects:

- mother health
- clone batches
- environment
- medium/rooting hormone
- rooting checks
- troubleshooting
- pheno hunting
- genetics notes
- future facility/nursery clone rooms

## Core Rule

Clones fail because of pressure points:

- mother health
- cut quality
- humidity/dome use
- temperature/root-zone temp
- light intensity
- medium moisture/oxygen
- cleanliness
- timing
- genetics

Do not blame genetics first unless repeated batches show the same pattern in good conditions.

## Required Records

- `CloneBatch`
- `CloneBatchCheck`
- `CloneTroubleshootingResult`
- `ClonePerformanceSummary`
- `CloneRoomProfile`

## Timing Logic

- days 0-3: roots not expected; wilt points to humidity/cut stress
- days 4-7: callus may start; leaves should not collapse
- days 7-14: roots often begin depending cultivar/method
- days 14-21: delayed rooting; check environment/mother/stem/genetics
- 21+: likely bottleneck or hard-to-root cultivar

## Bottlenecks

- mother health
- low humidity
- cold root zone
- light too strong
- medium too wet/oxygen limited
- medium too dry
- cut quality/rooting hormone
- genetics/pheno rooting difficulty

## Pheno/Genetics Outputs

Tags:

- roots fast
- roots slow
- hard to clone
- easy to clone
- strong mother
- weak mother
- clone candidate
- TC candidate

Elite flower but hard-to-clone should suggest backup preservation, extra clone attempts, reveg, or TC candidate.

## Acceptance

Complete when users can create clone batches, link mother/genetics/pheno, log checks, troubleshoot, create tasks/log/timeline, update clone performance, save/reload, enforce ownership, and use mobile UI.
