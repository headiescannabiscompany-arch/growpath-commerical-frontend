import { useEffect } from "react";
import { Platform } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

const STYLE_ID = "growpath-auth-autofill-theme";

export function authAutofillCss(palette: ThemePalette) {
  return `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
input:autofill {
  -webkit-text-fill-color: ${palette.text} !important;
  caret-color: ${palette.text} !important;
  -webkit-box-shadow: 0 0 0 1000px ${palette.surface} inset !important;
  box-shadow: 0 0 0 1000px ${palette.surface} inset !important;
}
`;
}

export default function AuthAutofillStyle() {
  const { palette } = useAppTheme();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = authAutofillCss(palette);

    return () => {
      style?.remove();
    };
  }, [palette]);

  return null;
}
