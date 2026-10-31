// Synthetic UI fixture only. Never imported by application code.
export const counts = { simulatedReplies: 0, forbiddenActions: 0, networkAttempts: 0 };
const notify = () => window.dispatchEvent(new Event("fixture-counts"));
export function forbidden() {
  counts.forbiddenActions++;
  notify();
  throw new Error("Action excluded from the mobile-scroll fixture");
}
export function blockedNetwork() {
  counts.networkAttempts++;
  notify();
  throw new Error("Network excluded from the mobile-scroll fixture");
}
export const listPersonalGrows = async () => [
  { id: "synthetic-grow", name: "Synthetic container garden", stage: "vegetative" }
];
export const listPersonalPlants = async () => [{ id: "synthetic-plant", crop: "tomato" }];
export const listPersonalLogs = async () => [];
export const listPersonalTasks = async () => [];
export const listToolRuns = async () => [];
export const getDiagnosisHistory = async () => [];
export const listNutrientRecipes = async () => [];
export const listTelemetrySources = async () => [];
export const getTelemetryPoints = async () => ({ points: [] });
export const fetchCommercialGrows = listPersonalGrows;
export const getFacilityTasks = async () => [];
export const getFacilityComplianceExport = forbidden;
export const apiRequest = forbidden;
export const API_URL = "http://127.0.0.1";
export const endpoints = {};
export const createPersonalLog = forbidden;
export const createPersonalTask = forbidden;
export const createFacilityTask = forbidden;
export const createEvidenceAsset = forbidden;
export const deleteEvidenceAsset = forbidden;
export const isTerminalEvidenceRegistrationError = () => true;
export const providerEvidencePayload = () => ({
  evidenceAssetIds: [],
  imageEvidenceAssetIds: [],
  images: [],
  videos: [],
  media: []
});
export const abortEvidenceUpload = forbidden;
export const getEvidenceUploadPlayback = forbidden;
export const uploadEvidenceMedia = forbidden;
export const uploadImage = forbidden;
export const abortVideoUpload = forbidden;
export const uploadVideoFile = forbidden;
export const runTool = forbidden;
export const requestCurrentCoordinates = forbidden;
export const launchImageLibraryAsync = forbidden;
export const requestMediaLibraryPermissionsAsync = forbidden;
export const MediaTypeOptions = { Images: "images", Videos: "videos" };
export const useLocalSearchParams = () => ({});
export const useRouter = () => ({
  push: forbidden,
  replace: forbidden,
  back: forbidden,
  canGoBack: () => false
});
export async function askPersonalAssistant() {
  counts.simulatedReplies++;
  notify();
  return {
    success: true,
    reply:
      "Synthetic reply start.\n" +
      Array.from(
        { length: 20 },
        (_, i) =>
          `Observation ${i + 1}: This is simulated layout evidence, not plant advice or a live AI response.`
      ).join("\n") +
      "\nSynthetic reply end.",
    actions: [],
    referencedData: [],
    proposedWrites: []
  };
}
export default function NoPromotedCampaigns() {
  return null;
}
