import React, { useEffect, useState } from "react";
import { Image, type ImageProps } from "react-native";

import { getCourseMediaAccessUrl } from "@/api/uploads";
import { resolveImageUri } from "@/utils/photoUploads";

function protectedCourseMediaUrl(value: string) {
  return /(?:^|\/api\/)(?:uploads\/)?course-media\/[a-f0-9]{24}\/file(?:\?.*)?$/i.test(
    value
  );
}

type Props = Omit<ImageProps, "source"> & {
  uri: string;
};

/** Resolves protected Facility course covers before React Native requests them. */
export default function AuthorizedCourseImage({ uri, ...props }: Props) {
  const rawUri = String(uri || "").trim();
  const [authorizedUri, setAuthorizedUri] = useState(() =>
    protectedCourseMediaUrl(rawUri) ? "" : resolveImageUri(rawUri)
  );

  useEffect(() => {
    let active = true;
    if (!rawUri) {
      setAuthorizedUri("");
      return () => {
        active = false;
      };
    }
    if (!protectedCourseMediaUrl(rawUri)) {
      setAuthorizedUri(resolveImageUri(rawUri));
      return () => {
        active = false;
      };
    }
    setAuthorizedUri("");
    getCourseMediaAccessUrl(rawUri)
      .then((url) => {
        if (active) setAuthorizedUri(resolveImageUri(url));
      })
      .catch(() => {
        if (active) setAuthorizedUri("");
      });
    return () => {
      active = false;
    };
  }, [rawUri]);

  return authorizedUri ? <Image {...props} source={{ uri: authorizedUri }} /> : null;
}
