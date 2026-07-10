export type DiagnosisPlantContext = {
  name?: string;
  cropCommonName?: string;
  scientificName?: string;
  cultivarOrStrain?: string;
  cropProfileId?: string | null;
  stage?: string;
  medium?: string;
  growthProfile?: {
    confirmationStatus?: string;
    cropProfile?: string | null;
    cropProfileId?: string | null;
    phenoLabel?: string;
    sizeMetrics?: {
      canopyWidthCm?: number;
      heightCm?: number;
    };
    timingAdjustments?: {
      stageDaysOffset?: number;
    };
    waterUseProfile?: {
      observedDemand?: string;
    };
  } | null;
} | null;

export type DiagnosisCropContextState = {
  status: "missing" | "unconfirmed" | "confirmed";
  title: string;
  message: string;
  details: string[];
};

const CONFIRMED_STATUSES = new Set(["user_confirmed", "reviewed", "verified"]);

function label(context: DiagnosisPlantContext, fallbackCrop?: string) {
  return [
    context?.cropCommonName || fallbackCrop,
    context?.scientificName,
    context?.cultivarOrStrain
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function diagnosisCropContextState(
  context: DiagnosisPlantContext,
  enteredCropCommonName = ""
): DiagnosisCropContextState {
  const enteredCrop = enteredCropCommonName.trim();
  if (!context && !enteredCrop) {
    return {
      status: "missing",
      title: "Crop context missing",
      message:
        "Diagnosis will run as general plant-health triage until species or crop profile is confirmed.",
      details: [
        "Crop identity changes likely symptoms, target pH/EC/VPD ranges, pest pressure, and next checks.",
        "Add a plant or enter the crop/species before relying on crop-specific guidance."
      ]
    };
  }

  const confirmationStatus = String(
    context?.growthProfile?.confirmationStatus || ""
  ).toLowerCase();
  const hasConfirmedProfile =
    Boolean(context?.cropProfileId || context?.growthProfile?.cropProfileId) &&
    CONFIRMED_STATUSES.has(confirmationStatus);
  const plantLabel = label(context, enteredCrop) || "selected crop";

  if (!hasConfirmedProfile) {
    return {
      status: "unconfirmed",
      title: "Crop context needs confirmation",
      message: `${plantLabel} will be sent to diagnosis, but GrowPath AI will treat crop-specific ranges as unverified until the profile is confirmed.`,
      details: [
        "Do not apply cannabis defaults to non-cannabis crops or cultivar names without confirmed species context.",
        "Confirm species/crop profile before using crop-specific diagnosis, nutrient, or IPM recommendations."
      ]
    };
  }

  const details = [
    "Confirmed crop context will be included with symptom pattern, root-zone context, environment, and measured numbers."
  ];
  if (context?.growthProfile?.sizeMetrics?.canopyWidthCm) {
    details.push(`Canopy width: ${context.growthProfile.sizeMetrics.canopyWidthCm} cm`);
  }
  if (context?.growthProfile?.timingAdjustments?.stageDaysOffset) {
    details.push(
      `Stage timing offset: ${context.growthProfile.timingAdjustments.stageDaysOffset} days`
    );
  }
  if (context?.growthProfile?.waterUseProfile?.observedDemand) {
    details.push(
      `Observed water demand: ${context.growthProfile.waterUseProfile.observedDemand}`
    );
  }
  if (context?.growthProfile?.phenoLabel) {
    details.push(`Pheno context: ${context.growthProfile.phenoLabel}`);
  }

  return {
    status: "confirmed",
    title: "Confirmed crop context",
    message: `${plantLabel} is linked to a confirmed crop profile for this diagnosis request.`,
    details
  };
}
