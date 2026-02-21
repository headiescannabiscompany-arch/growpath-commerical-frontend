# Tool Surface Map (Generated)

## Entries
- id: vpd
  label: VPD Calculator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: VPDCalculator
  gatingCaps: tools.vpdCalc
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: light
  label: Light Calculator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: LightCalculator
  gatingCaps: tools.lightCalc
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: nutrient
  label: Nutrient Calculator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: NutrientCalculator
  gatingCaps: tools.npkCalc
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: watering
  label: Watering Scheduler
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: WateringScheduler
  gatingCaps: tools.wateringScheduler
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: schedule
  label: Schedule Calculator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: ScheduleCalculator
  gatingCaps: tools.stageTimeline
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: ph_ec
  label: pH/EC Calculator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: PHECCalculator
  gatingCaps: tools.phEcCalc
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: growth
  label: Growth Tracker
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: GrowthTracker
  gatingCaps: tools.growthTracker
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: pest
  label: Pest & Disease Identifier
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: PestDiseaseIdentifier
  gatingCaps: tools.pestIdentifier
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: harvest
  label: Harvest Estimator
  shell: personal
  location: ToolsScreen (legacy nav)
  routeOrScreen: HarvestEstimator
  gatingCaps: tools.harvestEstimator
  status: enabled (cap-gated)
  source: src/screens/ToolsScreen.js
- id: tools-hub
  label: Tools Hub
  shell: personal
  location: /home/personal/(tabs)/tools
  routeOrScreen: /home/personal/tools
  gatingCaps: (none)
  status: enabled
  source: src/app/home/personal/(tabs)/tools/index.tsx
- id: vpd-tool
  label: VPD Calculator
  shell: personal
  location: Tools Hub card
  routeOrScreen: /home/personal/tools/vpd
  gatingCaps: (none)
  status: enabled
  source: src/app/home/personal/(tabs)/tools/index.tsx
- id: npk-helper
  label: NPK Helper
  shell: personal
  location: Tools Hub card
  routeOrScreen: (no route; planned)
  gatingCaps: (none)
  status: coming-soon
  source: src/app/home/personal/(tabs)/tools/index.tsx
- id: watering-tracker
  label: Watering Tracker
  shell: personal
  location: Tools Hub card
  routeOrScreen: (no route; planned)
  gatingCaps: (none)
  status: coming-soon
  source: src/app/home/personal/(tabs)/tools/index.tsx
- id: vpd-tool-screen
  label: VPD Calculator (tool screen)
  shell: personal
  location: /home/personal/tools/vpd
  routeOrScreen: src/app/home/personal/(tabs)/tools/vpd.tsx
  gatingCaps: (none)
  status: enabled
  source: src/app/home/personal/(tabs)/tools/vpd.tsx
- id: ai-chat
  label: AI Chat (personal)
  shell: personal
  location: /home/personal/(tabs)/ai
  routeOrScreen: /home/personal/ai
  gatingCaps: (none)
  status: enabled
  source: src/app/home/personal/(tabs)/ai/index.tsx
- id: calc_vpd
  label: calc_vpd tool
  shell: personal
  location: AI chat command
  routeOrScreen: toolRegistry
  gatingCaps: (none)
  status: enabled
  source: src/ai/toolRegistry.ts
- id: harvest-trichomes
  label: Analyze Trichomes
  shell: facility
  location: Facility AI Tools (matrix)
  routeOrScreen: TrichomeAnalysis
  gatingCaps: (feature.enabled + requires.growId)
  status: enabled
  source: src/features/ai/aiFeatureMatrix.ts
- id: harvest-window
  label: Estimate Harvest Window
  shell: facility
  location: Facility AI Tools (matrix)
  routeOrScreen: HarvestWindow
  gatingCaps: (feature.enabled + requires.growId)
  status: enabled
  source: src/features/ai/aiFeatureMatrix.ts
- id: climate-vpd
  label: Compute VPD
  shell: facility
  location: Facility AI Tools (matrix)
  routeOrScreen: ComputeVPD
  gatingCaps: (feature.enabled)
  status: disabled
  source: src/features/ai/aiFeatureMatrix.ts
- id: ec-recommend
  label: EC Recommendation
  shell: facility
  location: Facility AI Tools (matrix)
  routeOrScreen: ECRecommend
  gatingCaps: (feature.enabled)
  status: disabled
  source: src/features/ai/aiFeatureMatrix.ts
- id: facility-ai-ask
  label: Ask AI
  shell: facility
  location: Facility AI Tools tab tile
  routeOrScreen: /home/facility/ai/ask
  gatingCaps: (none)
  status: enabled
  source: src/app/home/facility/(tabs)/ai-tools.tsx
- id: facility-ai-diagnosis
  label: Photo Diagnosis
  shell: facility
  location: Facility AI Tools tab tile
  routeOrScreen: /home/facility/ai/diagnosis-photo
  gatingCaps: (none)
  status: enabled
  source: src/app/home/facility/(tabs)/ai-tools.tsx
- id: facility-ai-template
  label: SOP Template Assistant
  shell: facility
  location: Facility AI Tools tab tile
  routeOrScreen: /home/facility/ai/template
  gatingCaps: (none)
  status: enabled
  source: src/app/home/facility/(tabs)/ai-tools.tsx
- id: facility-ai4
  label: Compliance AI4 Dashboard
  shell: facility
  location: Facility AI Tools tab tile
  routeOrScreen: /home/facility/compliance/ai4.dashboard
  gatingCaps: (none)
  status: enabled
  source: src/app/home/facility/(tabs)/ai-tools.tsx

## Other Feature Registries (Non-tool but feature surface)
- Menu config: `src/config/menuConfig.js` (capability-driven nav items)
- Tab config: `src/navigation/tabConfig.js` (capability-driven tabs)
- Page registry: `src/navigation/pageRegistry.js` (capability-driven pages)
