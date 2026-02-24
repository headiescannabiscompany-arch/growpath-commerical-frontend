import { useCallback } from "react";
import { useRouter } from "expo-router";
import { handleApiError } from "@/utils/handleApiError";

export type UiErrorState = {
  title?: string;
  message: string;
  code?: string;
  requestId?: string | null;
};

type Deps = {
  logout?: (reason?: string) => void;
};

type ApiErrorMapper = ((err: any) => UiErrorState | null) & {
  toInlineError: (err: any) => UiErrorState | null;
};

export function useApiErrorHandler(deps: Deps = {}) {
  const router = useRouter();

  const mapper = useCallback(
    (err: any): UiErrorState | null => {
      const action = handleApiError(err, {
        showToast: undefined,
        logout: (reason) => {
          deps.logout?.(reason);
          router.replace("/login");
        },
        navigateReplace: (href) => router.replace(href)
      });

      if (action?.kind === "toast") {
        return {
          title: action.title,
          message: action.message,
          code: err?.code,
          requestId: err?.requestId ?? null
        };
      }
      return null;
    },
    [deps, router]
  );

  return Object.assign(mapper, { toInlineError: mapper }) as ApiErrorMapper;
}
