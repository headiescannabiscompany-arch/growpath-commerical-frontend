import React, { useEffect, useState } from "react";
import { Image, type ImageProps } from "react-native";

import { courseMediaAccessPath, getCourseMediaAccessUrl } from "@/api/uploads";
import { useAuth } from "@/auth/AuthContext";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = Omit<ImageProps, "source"> & {
  uri: string;
};

/** Resolves protected Facility course covers before React Native requests them. */
export default function AuthorizedCourseImage({ uri, ...props }: Props) {
  const { token } = useAuth();
  const rawUri = String(uri || "").trim();
  const requiresAccess = Boolean(courseMediaAccessPath(rawUri));
  const [authorized, setAuthorized] = useState<{
    rawUri: string;
    token: typeof token;
    url: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!requiresAccess) return;
    getCourseMediaAccessUrl(rawUri)
      .then((url) => {
        if (active) setAuthorized({ rawUri, token, url });
      })
      .catch(() => {
        if (active) setAuthorized(null);
      });
    return () => {
      active = false;
    };
  }, [rawUri, requiresAccess, token]);

  const authorizedUri = requiresAccess
    ? authorized?.rawUri === rawUri && authorized.token === token
      ? resolveImageUri(authorized.url)
      : ""
    : resolveImageUri(rawUri);
  return authorizedUri ? <Image {...props} source={{ uri: authorizedUri }} /> : null;
}
