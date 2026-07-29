# Crop Steering

Crop steering is controlled pressure with intent, not a generic target chase. Track stage, vegetative/generative/balanced/recovery/ripening goal, medium, irrigation timing, dryback, PPFD/DLI, VPD, EC/pH, plant response, recovery and quality effects.

Techniques are optional grow tasks with prerequisites and stop conditions. Do not recommend hard drybacks, EC stacking or more light when measurements are absent or stress is unresolved. Improvement with timely recovery may indicate useful steering; stalling, prolonged wilt, instability or quality loss means pressure was excessive.

Every steering entry belongs to an owner-scoped `crop_steering_project`. Preserve the project, repeated `crop_steering_entry` records, linked `ph_ec_check` records, direct measurements, tasks and grow-timeline events so the user can compare response over time. Do not silently replace missing stage, intent, medium, dryback, irrigation timing, PPFD/DLI, VPD/humidity, EC, pH or response observations with defaults.

When a selected owned plant is linked, only the documented steering tag vocabulary may be added to its pheno growth profile. A tag records an observed signal, not a final keeper claim. Tolerance tags require a positive recorded response; sensitivity tags require a recorded adverse response or applicable warning. Repeated runs and final quality evidence still control selection decisions.

Named timeline events distinguish project creation, entry logging, high pressure, positive or poor recovery, pH/EC logging, runoff warnings and steering-task creation. The durable module record remains the source object for each steering event.
