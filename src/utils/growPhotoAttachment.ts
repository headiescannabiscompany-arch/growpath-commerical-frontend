import { Alert } from "react-native";

import { appendGrowPhotos, listPersonalGrows } from "@/api/grows";
import { isPersistedImageUri } from "@/utils/photoUploads";

type GrowLike = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
};

type PromptOptions = {
  skip?: boolean;
  listGrows?: () => Promise<GrowLike[]>;
  appendPhotos?: (growId: string, photos: string[]) => Promise<unknown>;
};

function growId(grow: GrowLike) {
  return String(grow._id || grow.id || "");
}

function growLabel(grow: GrowLike, index: number) {
  return String(grow.name || grow.title || `Grow ${index + 1}`);
}

function selectGrow(grows: GrowLike[]): Promise<GrowLike | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Add photo to a grow?",
      "Attach this uploaded photo so it stays with the right grow.",
      [
        ...grows.slice(0, 6).map((grow, index) => ({
          text: growLabel(grow, index),
          onPress: () => resolve(grow)
        })),
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve(null)
        }
      ]
    );
  });
}

export async function maybePromptAttachPhotosToGrow(
  photos: string[],
  options: PromptOptions = {}
) {
  if (options.skip) return { prompted: false, attached: false };

  const persistedPhotos = photos.filter((photo) => photo && isPersistedImageUri(photo));
  if (!persistedPhotos.length) return { prompted: false, attached: false };

  const loadGrows = options.listGrows || listPersonalGrows;
  const savePhotos = options.appendPhotos || appendGrowPhotos;
  const grows = (await loadGrows()).filter((grow) => growId(grow));
  if (!grows.length) return { prompted: false, attached: false };

  const selected = await selectGrow(grows);
  if (!selected) return { prompted: true, attached: false };

  await savePhotos(growId(selected), persistedPhotos);
  return { prompted: true, attached: true, growId: growId(selected) };
}
