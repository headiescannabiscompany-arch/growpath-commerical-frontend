import { createToolRun } from "@/api/toolRuns";

type SaveAndOpenArgs = {
  router: { push: (href: string) => void };
  growId?: string;
  plantId?: string;
  cropProfileId?: string | null;
  cropIdentity?: Record<string, any> | null;
  selectedPlantContext?: Record<string, any> | null;
  plantGrowthProfile?: Record<string, any> | null;
  toolKey?: string;
  toolType?: string;
  toolRunId?: string;
  input: Record<string, any>;
  output: Record<string, any>;
};

type SaveAndOpenResult = { ok: true; toolRunId: string } | { ok: false; error: string };

export async function saveToolRunAndOpenJournal(
  args: SaveAndOpenArgs
): Promise<SaveAndOpenResult> {
  const growId = String(args.growId || "").trim();
  const toolType = String(args.toolKey || args.toolType || "").trim();
  if (!growId) {
    return { ok: false, error: "A grow is required to open journal entry flow." };
  }
  if (!toolType) {
    return { ok: false, error: "A tool key is required to save a run." };
  }

  let toolRunId = String(args.toolRunId || "").trim();
  if (!toolRunId) {
    const created = await createToolRun({
      toolType,
      growId,
      plantId: args.plantId,
      cropProfileId: args.cropProfileId,
      cropIdentity: args.cropIdentity,
      selectedPlantContext: args.selectedPlantContext,
      plantGrowthProfile: args.plantGrowthProfile,
      input: args.input,
      output: args.output
    });
    toolRunId = String(created?._id || created?.id || "").trim();
  }
  if (!toolRunId) {
    return { ok: false, error: "Unable to save tool run." };
  }

  args.router.push(
    `/home/personal/logs/new?growId=${encodeURIComponent(growId)}&toolRunId=${encodeURIComponent(
      toolRunId
    )}`
  );

  return { ok: true, toolRunId };
}
