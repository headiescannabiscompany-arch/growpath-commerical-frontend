import { createContext } from "react";
import type { invokeCourseGiftHttp } from "@/api/courseGiftHttp";

// Trusted composition only, never populated from URL, account or browser storage.
// Undefined preserves the accepted internal local adapter. Public roots are inert.
export const InternalCourseGiftTransportContext = createContext<
  typeof invokeCourseGiftHttp | undefined
>(undefined);
