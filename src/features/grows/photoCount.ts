type GrowPhotoRecord = {
  id?: unknown;
  _id?: unknown;
  photos?: unknown[];
};

type GrowLogPhotoRecord = {
  growId?: unknown;
  linkedGrowId?: unknown;
  photos?: unknown[];
};

function growRecordId(grow?: GrowPhotoRecord | null) {
  return String(grow?.id || grow?._id || "").trim();
}

export function growPhotoCount(
  grow?: GrowPhotoRecord | null,
  logs: GrowLogPhotoRecord[] = []
) {
  const growId = growRecordId(grow);
  const photos = new Set(
    (Array.isArray(grow?.photos) ? grow.photos : [])
      .map((photo) => String(photo || "").trim())
      .filter(Boolean)
  );
  logs.forEach((log) => {
    const logGrowId = String(log?.growId || log?.linkedGrowId || "").trim();
    if (!growId || logGrowId !== growId) return;
    (Array.isArray(log?.photos) ? log.photos : []).forEach((photo) => {
      const value = String(photo || "").trim();
      if (value) photos.add(value);
    });
  });
  return photos.size;
}

export function growPhotoRecordId(grow?: GrowPhotoRecord | null) {
  return growRecordId(grow);
}
