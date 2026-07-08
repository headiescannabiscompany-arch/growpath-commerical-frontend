# GrowPathAI Live Workflow Test Packs

These packs are for live workflow testing across the three major account modes:

- Single user: free/pro personal grow workflow
- Commercial: product, batch, trial, storefront, feed, and course workflow
- Facility: room, task, role, crop-run, harvest, dry/cure, and reporting workflow

Machine-readable fixture:

```txt
tests/fixtures/growpath-live-test-packs.json
```

Source-link verification:

```txt
npm.cmd run verify:live-test-packs:sources:planning
npm.cmd run verify:live-test-packs:sources
```

Use `verify:live-test-packs:sources:planning` while the packs are still being
assembled. Use strict `verify:live-test-packs:sources` before seeding source-backed
live data; it must fail if any source/photo links are still `TODO_...`.

Each pack tracks verified workflow coverage with:

```json
{
  "featureTestCount": 8,
  "growPathAIFeaturesTested": ["verified workflow area"]
}
```

Those fields should only increase after the pack has actually been exercised by
app/API tests or live workflow verification. Source fields can still remain
`TODO_...` until the external diary/photo links are pasted and reviewed.

## Photo Rights Rule

For third-party sources such as GrowDiaries:

```txt
Store the source diary/photo-set URL in grow data.
Do not copy, cache, upload, or rehost the photos inside GrowPathAI.
Use external links only unless GrowPathAI has rightsholder permission.
```

The fixture therefore uses:

```json
{
  "sourceLink": "...",
  "photoSourceLink": "...",
  "photoPolicy": "external_link_only",
  "sourcePhotoUrl": "..."
}
```

It must not use:

```json
{
  "uploadedAssetUri": "...",
  "localFilePath": "..."
}
```

## Pack 1: Single User Cannabis

```txt
Bruce Banner Auto - Coco/Perlite Home Grow
```

Use for:

- Free account grow/log/feed-banner checks
- Pro account tool-run/log/task checks
- External photo metadata checks
- GPT vision workflow checks using source links
- pH/TDS/RH/temp/nutrient/training/harvest field coverage

Current source fields are placeholders because the exact diary/photo URL still needs to be pasted:

```txt
TODO_PASTE_GROWDIARIES_BRUCE_BANNER_AUTO_DIARY_URL
TODO_PASTE_GROWDIARIES_BRUCE_BANNER_AUTO_PHOTO_PAGE_URL
```

Real grow values are stored separately under:

```txt
realGrowData
```

For the GrowDiaries pack, `realGrowData` is intentionally marked:

```json
{
  "dataConfidence": "source_pending",
  "doNotInventMissingValues": true,
  "sourceRequiredBeforeSeeding": true
}
```

This means the fixture can describe the fields we need, but actual dates, weights,
weekly readings, taste notes, and effect notes must be extracted from the linked
source before seeding live data.

Germination fields are tracked separately:

```txt
germinationDate
germinationMethod
daysToSprout
seedlingVigor
sourceLink
photoSourceLink
```

Known setup values from the user prompt are stored directly instead of being
invented from the source:

```txt
germinationMethod: paper_towel
medium: coco_perlite
potSize: 3 gallon
containerType: fabric_pot
lightSchedule: 20/4
cocoPreparation: pre-soaked coco with light nutrients plus CalMag
```

External-source facts that have not been provided, such as exact dates, days to
sprout, weekly readings, harvest date, and dry weight, remain
`TODO_EXTRACT_FROM_SOURCE` until the source diary/photo links are pasted and
reviewed.

Week 0 is reserved for germination/early seedling source photos. The current
single-user test pack expects:

```txt
week: 0
stage: germination
germinationMethod: paper_towel
medium: coco_perlite
potSize: 3 gallon fabric pot
lightSchedule: 20/4
cocoPreparation: pre-soaked coco with light nutrients plus CalMag
photoCount: 3
photos: three external-only photoSourceLink records
plannedFeatureCoverage: Seed start, Medium setup, Germination photo log
```

`plannedFeatureCoverage` describes what the row should exercise when tested.
It does not increment `featureTestCount` by itself; the count only increases
after the workflow has a passing test or live verification note.

Week 1 is marked as a user-confirmed seedling stage:

```txt
week: 1
stage: seedling
stageConfirmedByUser: true
lightHours: 20
dayTempC: 25
nightTempC: 22
rhPercent: 65
ph: 6.2
ppm: 425
potVolumeL: 11.36
lampDistanceCm: 85
photoCount: 6
photos: six external-only photoSourceLink records
plannedFeatureCoverage: Environment log, VPD, Seedling photo check
```

Measurements and photo links for Week 1 still remain external/source-backed
placeholders until the GrowDiaries source is reviewed.

Week 2 is marked as a user-confirmed veg stage:

```txt
week: 2
stage: veg
stageConfirmedByUser: true
dayTempC: 25
nightTempC: 22
rhPercent: 65
ph: 6.2
ppm: 500
wateringCadenceDays: 3
wateringCadenceNote: about every 3 days
irrigationStyle: run_to_waste
irrigationStyleStarted: true
photoCount: 6
photos: six external-only photoSourceLink records
plannedFeatureCoverage: Watering schedule, Runoff tracking, Root-zone notes
```

Week 3 is marked as a user-confirmed veg/training stage:

```txt
week: 3
stage: veg/training
stageConfirmedByUser: true
tempC: 25
rhPercent: 65
ph: 6.2
ppm: 550
toppingDay: 15
toppingNode: 5
training: topped on day 15 at 5th node, then started LST
photoSubject: topping
photoCount: 9
photos: nine external-only photoSourceLink records
plannedFeatureCoverage: Training log, Topping reminder, Stress-risk AI check
```

Week 4 is marked as a user-confirmed veg/canopy build stage:

```txt
week: 4
stage: veg/canopy build
stageConfirmedByUser: true
tempC: 25
rhPercent: 65
ph: 6.2
ppm: 600
trainingNotes: Plant trained wide
morphologyNotes: Compact/bushy phenotype noted
morphologyTags: compact, bushy, trained_wide
photoSubject: LST
photoCount: 8
photos: eight external-only photoSourceLink records
plannedFeatureCoverage: Canopy/morphology notes, Photo comparison
```

Week 5 is marked as a user-confirmed pre-flower stage:

```txt
week: 5
stage: pre-flower
stageConfirmedByUser: true
tempC: 25
rhPercent: 60
ph: 6.2
ppm: 600
wateringFrequencyPerDay: 2
wateringFrequencyNote: Watering twice daily to runoff
runoffTracked: true
training: HST/LST active
input: silica used
defoliationStatus: not_started
defoliationNotes: No defoliation yet
photoCount: 9
photos: nine external-only photoSourceLink records
plannedFeatureCoverage: Nutrient log, Watering frequency, Training timeline
```

Week 6 is marked as a user-confirmed flower stage:

```txt
week: 6
stage: flower
stageConfirmedByUser: true
floweringStatus: begins
flowerBegins: true
defoliation: first defoliation
wateringFrequencyPerDay: 3
wateringFrequencyNote: Watering 3x daily run-to-waste
irrigationStyle: run_to_waste
ecTargetRange: 1.2-1.3 mS/cm
photoSubject: defoliation
photoCount: 11
photos: eleven external-only photoSourceLink records
plannedFeatureCoverage: Flower transition, Defoliation log, Runoff EC
```

Week 7 is marked as a user-confirmed flower stage:

```txt
week: 7
stage: flower
stageConfirmedByUser: true
tempC: 25
rhPercent: 55
ph: 6.2
ppm: 600
budSitesStatus: forming
structureNotes: Compact indica-like structure
morphologyTags: compact, indica_like
defoliation: light
photoCount: 9
photos: nine external-only photoSourceLink records
plannedFeatureCoverage: AI weekly plant summary, Airflow/light penetration
```

Week 8 is marked as a user-confirmed flower/bud stack stage:

```txt
week: 8
stage: flower/bud stack
stageConfirmedByUser: true
tempC: 25
rhPercent: 55
ph: 6.2
ppm: 650
stretchStatus: stopped
budDevelopmentNotes: Dense sticky buds
budStructureTags: dense, sticky
training: lollipopping active, minor defoliation
input: PK booster started
photoCount: 17
photos: seventeen external-only photoSourceLink records
plannedFeatureCoverage: Bud development log, Lollipop task, Nutrient adjustment
```

Week 9 is marked as a user-confirmed flower/resin stage:

```txt
week: 9
stage: flower/resin
stageConfirmedByUser: true
tempC: 25
rhPercent: 55
ph: 6.2
ppm: 650
resinNotes: Heavy resin
resinIntensity: heavy
airflowAdded: true
airflowNotes: Added airflow
runoffECCheckFrequency: 2-3x weekly
runoffECTracked: true
photoCount: 20
photos: twenty external-only photoSourceLink records
plannedFeatureCoverage: Mold-risk prevention, Runoff trend, Photo resin tracking
```

Week 10 is marked as a user-confirmed flush/ripening stage:

```txt
week: 10
stage: flush/ripening
stageConfirmedByUser: true
tempC: 25
rhPercent: 50
ph: 6.2
ppm: 650
flushStarted: true
flushStartDay: 67
trichomeObservation: mostly cloudy, 1-5% amber
photoCount: 25
photos: twenty-five external-only photoSourceLink records
plannedFeatureCoverage: Harvest timing, Trichome log, Flush task
```

Week 11 is marked as a user-confirmed harvest stage:

```txt
week: 11
stage: harvest
stageConfirmedByUser: true
harvestDay: 73
dryWeight: 236 g
plantCount: 1
growAreaM2: 0.36
yieldPerM2: 655.56 g/m2
tasteNotes: diesel, earthy, mint
photoSubject: harvest/dry
photoCount: 34
photos: thirty-four external-only photoSourceLink records
plannedFeatureCoverage: Harvest report, Yield report, Smoke report, Share card
```

## Pack 2: Commercial Non-Cannabis

Use for:

- Commercial product-trial mode
- Non-cannabis crop workflow
- Crop batch creation
- Cultivar comparison
- Germination rate
- Seedling propagation
- Transplanting
- Outdoor hardening
- Soil/input comparison
- Supplier issue notes
- Harvest count
- Recovery tracking

Current source fields are placeholders because the exact diary/photo URL still
needs to be pasted:

```txt
Tomatoes Sunviva / Primabella Outdoor
TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL
TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_PHOTO_PAGE_URL
```

Known setup values from the user prompt:

```txt
cropType: tomato
cultivars: Sunviva, Primabella
environment: outdoor
workflow: product trial evidence run / cultivar comparison
```

This pack should exercise:

- Commercial product trial evidence workspace
- Non-cannabis crop records
- Crop batch creation
- Cultivar comparison
- Germination and seedling propagation records
- Transplant and outdoor hardening logs
- Soil/input comparison
- Supplier issue notes
- Harvest count
- Recovery tracking

Commercial Tomato Week 0 is marked as user-confirmed Germination, with detailed
source data still pending:

```txt
week: 0
stage: germination
stageConfirmedByUser: true
germinationMethod: direct_substrate
cultivarGermination: Sunviva 6/6, Primabella 5/6
photoPolicy: external_link_only
photoCount: 1
photos: one external-only photoSourceLink record
realGrowDataStatus: user_confirmed_germination
plannedFeatureCoverage: Crop start, Product trial germination record, Cultivar comparison, Germination rate, Source-backed weekly log
```

Commercial Tomato Week 1 is marked as user-confirmed Seedling, with detailed
source data still pending:

```txt
week: 1
stage: seedling
stageConfirmedByUser: true
plantHeightCm: 2
lightHours: 16
rhPercent: 70
wateringLiters: 0.05
lampDistanceCm: 40
co2Ppm: 800
vpdKpa: 0.8
ppfd: 200
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: user_confirmed_seedling_environment
plannedFeatureCoverage: Propagation dashboard, Product trial seedling record, Seedling propagation, VPD tracking, Seedling photo log, PPFD tracking, CO2 tracking, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 2 is marked as user-confirmed Veg, with detailed source
data still pending:

```txt
week: 2
stage: veg
stageConfirmedByUser: true
plantHeightCm: 5
lightHours: 16
tempC: 19
rhPercent: 60
inputs: Root Juice 2 ml/L
ppfd: 300
photoPolicy: external_link_only
photoCount: 4
photos: four external-only photoSourceLink records
realGrowDataStatus: user_confirmed_veg_growth
plannedFeatureCoverage: Product trial veg record, Nutrient log, Growth rate, Input tracking, PPFD tracking, Cultivar comparison, Cultivar notes, Product trial crop growth tracking, Source-backed weekly log
```

Commercial Tomato Week 3 is marked as user-confirmed Veg / Selection, with
detailed source data still pending:

```txt
week: 3
stage: veg / selection
stageConfirmedByUser: true
plantHeightCm: 10
lightHours: 18
tempC: 19
rhPercent: 60
selection: reduced from 11 plants to 6
stressCorrection: wind stress from fan corrected
photoPolicy: external_link_only
photoCount: 4
photos: four external-only photoSourceLink records
realGrowDataStatus: user_confirmed_selection
plannedFeatureCoverage: Product trial veg record, Selection workflow, Plant selection, Plant count tracking, AI stress diagnosis, Stress correction, Fan task, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 4 is marked as user-confirmed Veg / Pruning, with
detailed source data still pending:

```txt
week: 4
stage: veg / pruning
stageConfirmedByUser: true
cultivarMeasurements: Sunviva around 30 cm, Primabella around 15 cm
pruningEvents: side shoots removed
wateringLitersTotal: 1.5
ph: 6.5
inputs: Root Juice, Epsom salt
photoPolicy: external_link_only
photoCount: 4
photos: four external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Product trial veg record, Pruning log, Pruning/suckering task, Side shoot removal, Cultivar height comparison, Cultivar morphology, Watering log, pH log, Input tracking, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 5 is marked as user-confirmed Transplant / Preflower,
with detailed source data still pending:

```txt
week: 5
stage: transplant / preflower
stageConfirmedByUser: true
tableHeightCm: 40
transplantEvent: rootbound 0.5 L pots transplanted into 2 L pots
rootZoneObservation: rootbound 0.5 L pots
cultivarObservations: Sunviva first flowers, Primabella compact
outsideTrial: extra plants tested outside in 30 L pots
photoPolicy: external_link_only
photoCount: 8
photos: eight external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Product trial transplant record, Transplant log, Preflower transition, Rootbound note, Rootbound alert, Pot size change, Cultivar morphology, Outdoor 30 L trial, Hardening trial, Outdoor hardening log, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 6 is marked as user-confirmed Veg / Flowering Start,
with detailed source data still pending:

```txt
week: 6
stage: veg / flowering start
stageConfirmedByUser: true
cultivarMeasurements: Sunviva about 75 cm, Primabella about 45 cm
floweringStatus: both varieties started flowering
hardeningEvents: plants placed outside on sunny days
photoPolicy: external_link_only
photoCount: 3
photos: three external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Product trial veg record, Flowering start log, Stage change, Cultivar height comparison, Both-variety flowering log, Sunny-day outdoor hardening, Outdoor acclimation, Preflower tracking, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 7 is marked as user-confirmed Flower / First Fruit, with
detailed source data still pending:

```txt
week: 7
stage: flower / first fruit
stageConfirmedByUser: true
plantHeightCm: 80
tempC: 20
rhPercent: 50
inputs: Fish-Mix 2 ml/L
fruitSetStatus: first fruits setting
potLimitation: 2 L pots becoming limiting
photoPolicy: external_link_only
photoCount: 4
photos: four external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Product trial flower record, First fruit log, Fruit set tracking, Fruit-set log, Input tracking, Pot limitation warning, Root-zone warning, Transplant reminder, Environment log, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 8 is marked as user-confirmed Flower / Fruiting, with
detailed source data still pending:

```txt
week: 8
stage: flower / fruiting
stageConfirmedByUser: true
plantHeightCm: 100
tempC: 20
rhPercent: 50
wateringLiters: 0.4
inputs: Fish-Mix 2 ml/L
fruitStatus: first green tomatoes
plannedTransplant: 30 L planned
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Product trial flower record, Fruiting log, Fruit development tracking, Fruit tracking, First green tomato log, Watering log, Input tracking, 30 L transplant reminder, Transplant scheduling, Environment log, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 9 is marked as user-confirmed Outdoor Transition, with
detailed source data still pending:

```txt
week: 9
stage: outdoor transition
stageConfirmedByUser: true
plantHeightCm: 110
tempC: 20
rhPercent: 50
inputs: Fish-Mix 2 ml/L
outdoorTransition: plants moving outdoors permanently
plannedTransplant: 30 L pots planned
photoPolicy: external_link_only
photoCount: 8
photos: eight external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Outdoor transition log, Permanent outdoor move, Hardening continuation, Transplant follow-up, 30 L transplant reminder, Outdoor transition task reminders, Input tracking, Environment log, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 10 is marked as user-confirmed Final Pots, with detailed
source data still pending:

```txt
week: 10
stage: final pots
stageConfirmedByUser: true
finalPots: 3 x 30 L, 1 x 40 L
soilOptions: Sonnerde or Neudorff
inputs: compost tea, Great White
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Final pot log, Transplant completion, Batch transplant, Final pot inventory, Soil/input comparison, Soil lot tracking, Input tracking, Compost tea log, Great White input log, Outdoor production setup, Cultivar comparison, Source-backed weekly log
```

Commercial Tomato Week 11 is marked as user-confirmed First Harvest, with
detailed source data still pending:

```txt
week: 11
stage: first harvest
stageConfirmedByUser: true
harvestEvents: first Sunviva tomatoes ripe and harvested
soilPerformanceComparison: Sonnerde outperforming Neudorff so far
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: First harvest log, Harvest log, Harvest count, Cultivar harvest record, Ripe tomato harvest, Soil performance comparison, Soil comparison, Sonnerde vs Neudorff comparison, Cultivar performance, Cultivar comparison, Product trial crop summary, Source-backed weekly log
```

Commercial Tomato Week 12 is marked as user-confirmed Soil Issue, with detailed
source data still pending:

```txt
week: 12
stage: soil issue
stageConfirmedByUser: true
soilPerformanceComparison: strong Sonnerde vs Neudorff difference, Neudorff lagging
supplierContact: grower contacted Neudorff
photoPolicy: external_link_only
photoCount: 4
photos: four external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Soil issue log, Soil comparison follow-up, Soil performance gap, Lagging plant tracking, Supplier issue note, Supplier issue, Input performance, Crop health comparison, Root-zone diagnosis, Cultivar performance, Source-backed weekly log
```

Commercial Tomato Week 13 is marked as user-confirmed Fertility Correction, with
detailed source data still pending:

```txt
week: 13
stage: fertility correction
stageConfirmedByUser: true
plantHeightCm: 110
wateringLiters: 0.8
inputs: Neudorff fertilizer applied
harvest: about 10 tomatoes harvested
soilIssue: poor water retention noted
photoPolicy: external_link_only
photoCount: 5
photos: five external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Fertility correction log, Soil issue response, Input adjustment, Neudorff fertilizer log, Poor water retention warning, Soil problem tracking, Harvest count, Watering log, Crop recovery tracking, Source-backed weekly log
```

Commercial Tomato Week 14 is marked as user-confirmed Recovery, with detailed
source data still pending:

```txt
week: 14
stage: recovery
stageConfirmedByUser: true
plantHeightCm: 110
potVolumeL: 30
wateringLiters: 1.5
recoveryObservations: plants greener, stems thicker, new flowers after fertilizer
correctionResponse: positive after fertilizer
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Recovery log, Recovery tracking, Post-correction response, Positive fertilizer response, Plant color recovery, Stem thickening, New flower tracking, Watering log, Soil problem follow-up, Crop health comparison, Weekly crop report, Source-backed weekly log
```

Commercial Tomato Week 15 is marked as user-confirmed Ongoing Harvest, with
detailed source data still pending:

```txt
week: 15
stage: ongoing harvest
stageConfirmedByUser: true
plantHeightCm: 110
potVolumeL: 30
wateringLiters: 1.5
recoveryStatus: all four tomato plants recovered
harvest: a few tomatoes harvested
flavorNotes: sweet, aromatic
photoPolicy: external_link_only
photoCount: 5
photos: five external-only photoSourceLink records
realGrowDataStatus: stage_only_pending_details
plannedFeatureCoverage: Ongoing harvest log, Harvest count, Full plant recovery, Flavor notes, Watering log, Crop production tracking, Cultivar performance, Source-backed weekly log
```

## Pack 3: Facility Cannabis Workflow

```txt
MAC1 FloraFlex - 8 Plant Clone Batch
```

Use for:

- Facility room workflows
- Role/permission checks
- Room/task/IPM/environment reviews
- 8 uniform clone batch workflow
- Reservoir mixing and RO water tracking
- CO2, screens, PPFD adjustment, and runoff EC workflow
- Lollipop, shwazzing/defoliation, and flush tasks
- Harvest crew workflow
- Harvest and dry/cure checks
- Facility crop summary
- Post-harvest quality notes

Current source fields are placeholders because the exact diary/photo URL still
needs to be pasted:

```txt
TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL
TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_PHOTO_PAGE_URL
```

Known setup values from the user prompt:

```txt
cultivar: MAC1
system: FloraFlex
sourceType: clone_batch
plantCount: 8
uniformClones: true
waterSource: RO
tracksCO2: true
tracksScreens: true
tracksRunoffEC: true
tracksHarvestCrewWorkflow: true
tracksRoomReset: true
```

The facility pack starts with:

```json
{
  "featureTestCount": 0,
  "growPathAIFeaturesTested": []
}
```

Those fields stay unchanged until the facility workflow is actually run through
the app and verified.

Facility Week 0 is marked as user-confirmed clone selection:

```txt
week: 0
stage: clone selection
stageConfirmedByUser: true
clonesTaken: 16
selectedCloneCount: 8
selectionCriteria: most_uniform
startMedium: rockwool_cube
cloneSelectionNotes: 16 clones taken, 8 most uniform selected. Rockwool cube start.
photoPolicy: external_link_only
photoCount: 1
photos: one external-only photoSourceLink record
plannedFeatureCoverage: Clone intake, Batch creation, Selection notes
```

Facility Week 1 is marked as user-confirmed veg:

```txt
week: 1
stage: veg
stageConfirmedByUser: true
plantHeightCm: 8.89
lightHours: 18
dayTempC: 24
nightTempC: 20
rhPercent: 65
ph: 6.0
co2Ppm: 650
wateringVolumeL: 0.76
photoPolicy: external_link_only
photoCount: 2
photos: two external-only photoSourceLink records
plannedFeatureCoverage: Room environment, Batch feed, Reservoir SOP
```

Facility Week 2 is marked as user-confirmed veg:

```txt
week: 2
stage: veg
stageConfirmedByUser: true
feedTimingChanges: added_second_feed_timing
reservoirConcern: slime
productChanges: switched CalMag product
photoPolicy: external_link_only
photoCount: 1
photos: one external-only photoSourceLink record
plannedFeatureCoverage: Facility alert, Reservoir issue, Staff note
```

Facility Week 3 is marked as user-confirmed veg:

```txt
week: 3
stage: veg
stageConfirmedByUser: true
plantHeightCm: 35.56
lightHours: 18
tempC: 24
rhPercent: 65
ph: 6.0
co2Ppm: 750
wateringVolumeL: 1.51
photoPolicy: external_link_only
photoCount: 5
photos: five external-only photoSourceLink records
plannedFeatureCoverage: Batch growth tracking, Screen prep
```

Facility Week 4 is marked as user-confirmed veg/flip prep:

```txt
week: 4
stage: veg/flip prep
stageConfirmedByUser: true
trainingEvents: lollipopping completed
screenEvents: first_screen installed, upper_screen installed
flushEvents: pre_flip_flush with flower_nutrients
sourceNotes: TODO_EXTRACT_WEEK_4_SOURCE_NOTES
photoPolicy: external_link_only
plannedFeatureCoverage: Flip checklist, Trellis task, Defoliation SOP
```

Facility Week 5 is marked as user-confirmed Flower Week 1:

```txt
week: 5
stage: flower week 1
stageConfirmedByUser: true
plantHeightCm: 40.64
lightHoursListed: 18
tempC: 24
rhPercent: 60
ph: 6.0
co2Ppm: 750
wateringVolumeL: 1.89
sourceNotes: TODO_EXTRACT_WEEK_5_SOURCE_NOTES
realGrowDataStatus: source_pending
photoPolicy: external_link_only
plannedFeatureCoverage: Flower phase change, Nutrient schedule switch
```

Facility Week 6 is marked as user-confirmed Flower Week 2:

```txt
week: 6
stage: flower week 2
stageConfirmedByUser: true
trainingEvents: supercropping active, training active
plannedDefoliationEvents: day 20 strip planned
photoPolicy: external_link_only
photoCount: 17
photos: seventeen external-only photoSourceLink records
plannedFeatureCoverage: Staff task, Crop steering, Training notes
```

Facility Week 7 is marked as user-confirmed Flower Week 3:

```txt
week: 7
stage: flower week 3
stageConfirmedByUser: true
lightHours: 12
tempC: 24
rhPercent: 55
ph: 5.9
co2Ppm: 750
defoliationEvents: day 20 strip/shwazze completed
humidityAdjustment: target 55% RH
photoPolicy: external_link_only
photoCount: 7
photos: seven external-only photoSourceLink records
plannedFeatureCoverage: Defoliation labor log, Humidity alert, Trichome photo
```

Facility Week 8 is marked as user-confirmed Flower Week 4:

```txt
week: 8
stage: flower week 4
stageConfirmedByUser: true
plantHeightCm: 71.12
lightHours: 12
dayTempC: 26
nightTempC: 19
ph: 5.9
tdsPpm: 950
rhPercent: 55
co2Ppm: 750
stretchStatus: stopped
screenNotes: Lower colas reached second screen
photoPolicy: external_link_only
photoCount: 12
photos: twelve external-only photoSourceLink records
plannedFeatureCoverage: Canopy tracking, Stretch report, Bud-site monitoring
```

Facility Week 9 is marked as user-confirmed Flower Week 5:

```txt
week: 9
stage: flower week 5
stageConfirmedByUser: true
plantHeightCm: 71.12
tempC: 25
rhPercent: 53
ph: 6.0
tdsPpm: 1000
co2Ppm: 850
photoPolicy: external_link_only
photoCount: 23
photos: twenty-three external-only photoSourceLink records
plannedFeatureCoverage: PPFD/CO2 crop steering, Light stress check
```

Facility Week 10 is marked as user-confirmed Flower Week 6, with detailed
source data still pending:

```txt
week: 10
stage: flower week 6
stageConfirmedByUser: true
plantHeightCm: 76.2
tempC: 24
rhPercent: 55
ph: 6.0
tdsPpm: 850
co2Ppm: 650
cropSteeringAdjustment: Reduced CO2 and light to avoid foxtail/transpiration imbalance.
photoPolicy: external_link_only
photoCount: 7
photos: seven external-only photoSourceLink records
realGrowDataStatus: user_confirmed_measurements
plannedFeatureCoverage: AI diagnosis, Crop steering adjustment, Environmental risk, CO2 crop steering, Light intensity steering, Foxtail/transpiration imbalance prevention
```

Facility Week 11 is marked as user-confirmed Late Flower, with detailed source
data still pending:

```txt
week: 11
stage: late flower
stageConfirmedByUser: true
plantHeightCm: 76.2
tempC: 24
rhPercent: 55
ph: 5.9
tdsPpm: 950
co2Ppm: 650
wateringLiters: 3.79
runoffCorrection: runoff flushed from over 2000 ppm toward 1500 ppm
photoPolicy: external_link_only
photoCount: 8
photos: eight external-only photoSourceLink records
realGrowDataStatus: user_confirmed_measurements
plannedFeatureCoverage: Late flower monitoring, Runoff EC/TDS correction, Salt buildup alert, Late flower report, pH/EC range check, Facility finish progression, Source-backed weekly log
```

Facility Week 12 is marked as user-confirmed Late Flower, with detailed source
data still pending:

```txt
week: 12
stage: late flower
stageConfirmedByUser: true
plantHeightCm: 76.2
tempC: 25
rhPercent: 55
ph: 6.1
tdsPpm: 850
co2Ppm: 500
irrigationSchedule: 1 gal/plant/day, 3 min x 5 feeds during lights on
photoPolicy: external_link_only
photoCount: 6
photos: six external-only photoSourceLink records
realGrowDataStatus: user_confirmed_measurements
plannedFeatureCoverage: Late flower monitoring, Irrigation schedule, Irrigation timing, Trichome monitoring, Runoff EC, Facility feed schedule, Facility finish progression, Source-backed weekly log
```

Facility Week 13 is marked as user-confirmed Ripening, with detailed source
data still pending:

```txt
week: 13
stage: ripening
stageConfirmedByUser: true
plantHeightCm: 76.2
tempC: 24
rhPercent: 55
ph: 5.9
tdsPpm: 950
co2Ppm: 500
trichomeCheck: Day 55 trichomes, 2+ weeks left
photoPolicy: external_link_only
photoCount: 8
photos: eight external-only photoSourceLink records
realGrowDataStatus: user_confirmed_measurements
plannedFeatureCoverage: Ripening monitoring, Trichome monitoring, Harvest readiness, Harvest window estimate, Harvest forecast, Maturity tracking, Source-backed weekly log
```

Facility Week 14 is marked as user-confirmed Flush / Harvest Prep, with detailed
source data still pending:

```txt
week: 14
stage: flush / harvest prep
stageConfirmedByUser: true
tempDayC: 22
tempNightC: 18
rhPercent: 55
ph: 5.9
tdsPpm: 500
co2Ppm: 400
waterSource: RO
feedInputs: CalMag
lightAdjustment: lights reduced
harvestStatus: harvest planned
photoPolicy: external_link_only
photoCount: 12
photos: twelve external-only photoSourceLink records
realGrowDataStatus: user_confirmed_measurements
plannedFeatureCoverage: Flush tracking, Flush SOP, Harvest prep, Light taper, Light reduction, RO water feed record, CalMag record, Source-backed weekly log
```

Facility Week 15 is marked as user-confirmed Harvest / Dry / Cure, with detailed
source data still pending:

```txt
week: 15
stage: harvest / dry / cure
stageConfirmedByUser: true
plantCount: 8
totalCycleDays: 100
darkPeriodHours: 24
harvestWindow: 4:00 a.m. to 9:45 a.m.
dryRoom: 60% RH target, 65°F/55% ambient noted
moistureMeterUsed: true
cureContainer: CVault
photoPolicy: external_link_only
photoCount: 21
photos: twenty-one external-only photoSourceLink records
realGrowDataStatus: user_confirmed_harvest_dry_cure
plannedFeatureCoverage: Harvest report, Harvest labor, Dry room tracking, Dry room log, Cure tracking, Cure tracker, Moisture meter record, CVault cure record, Room reset, Source-backed weekly log
```

Facility crop summaries are private operational records unless explicitly linked
to commercial/public workflows.

## Acceptance

The fixture is covered by:

```txt
tests/unit/live-test-packs-fixture.test.ts
tests/unit/live-test-packs-workflow-readiness.test.ts
```

The fixture test verifies:

- all three account modes are represented
- third-party photos remain external-only
- GrowDiaries source attribution placeholders exist
- `sourceLink` and `photoSourceLink` fields are present for external photo records

The workflow readiness test verifies:

- the personal pack can drive free/pro grow-flow checks
- the commercial pack can drive a non-cannabis crop trial, crop summary, cultivar comparison, soil/input issue, recovery, and harvest workflow
- the facility pack can drive room, batch, reservoir, runoff, harvest crew, dry/cure, room reset, product trial crop summary, and harvest quality-note checks

These tests prove the packs are ready to use as workflow fixtures. They do not
mark app features as live-verified yet. Keep `featureTestCount` at `0` and
`growPathAIFeaturesTested` empty until a UI/API verification run actually uses
the packs against GrowPathAI workflows.
