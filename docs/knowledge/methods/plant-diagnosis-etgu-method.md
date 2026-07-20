# Plant Diagnosis — ETGU

Read the pattern. Read the medium. Read the environment. Read the numbers. Then name likely causes.

Required evidence includes old/new growth location, distribution, progression, whole plant and close media, medium/root-zone behavior, watering/feed/topdress history, environment, pH/EC and crop stage. The interface must ask for progression explicitly, label temperature units, and preserve pattern, root-zone, environment, and measured-number context when a user answers the follow-up question. Consider deficiency, excess, lockout, antagonism, water/root issues, environment-limited uptake, pests/disease, spray/light/physical damage, organic release timing and salt buildup.

Output likely causes with evidence, counter-evidence, missing information and discriminating next checks. Say “consistent with a calcium transport issue” rather than declaring a calcium deficiency when humidity, roots, pH or K/Ca/Mg competition could match.

## Image evidence behavior

Photo uploads must never imply that image pixels were inspected when the active provider is text-only. In that state, preserve the photos as linked evidence, label visual analysis as not performed, and require written symptom observations before producing triage. The UI must state what the current engine can use.

When image analysis is available, request a whole-plant context photo, a photo showing symptom distribution, and sharp close-ups of both leaf surfaces. A photo-only result must report whether visual analysis was actually performed and ask for replacement media when blur, lighting, distance, or missing leaf-surface coverage prevents useful review.

Every result must provide a discriminating follow-up question. Saved diagnoses, journal entries, tasks, attached evidence, and user-confirmed outcome feedback remain linked to the selected grow and plant.

## Crop identity confirmation

Species/crop identification suggestions remain drafts until the user presses an explicit confirmation action. Confirmation must write the common name, scientific name when known, cultivar separately, aliases, confirmation provenance, timestamp, and source tool run to the selected grow or plant. A grow-level confirmation also updates crop tags and interests so downstream diagnosis and crop-specific tool visibility can use the same identity. Never infer or persist a cultivar from appearance alone.

Crop identification must run without a grow. Grow and plant context are optional attachments used for private history, saving, logs, and follow-up tasks; they are not prerequisites for inspecting uploaded media or returning a draft identity. Collect photo evidence before presenting the image-analysis action. User confirmation is an explicit result action, not a free-form true/false input. The result must state whether image pixels were actually analyzed. A clear cannabis flower or harvested bud may support a draft crop-level identification when visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure are consistent. Do not require a fan-leaf photo when the flower is independently recognizable, and never infer a cultivar/strain from bud appearance.

Plant diagnosis uses the same server-side OpenAI credential as other image-capable GrowPath AI workflows. A successful image request must record that image analysis was requested and performed, the number of photos inspected, and the provider/model label. A failed or text-only request must say that pixels were not analyzed and request written observations or better evidence rather than presenting a generic result as visual analysis.
