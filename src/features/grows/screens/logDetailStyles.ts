import { StyleSheet } from "react-native";
import { type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function createLogDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      backgroundColor: palette.page,
      justifyContent: "center"
    },
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 40, gap: 10 },
    title: { fontSize: 22, fontWeight: "800", color: palette.text },
    meta: { fontSize: 13, color: palette.textMuted },
    card: {
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.card,
      gap: 8
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: palette.text },
    cardText: { color: palette.textMuted, lineHeight: 20 },
    notes: { color: palette.textSoft, lineHeight: 20 },
    linkMeta: { color: palette.textMuted, lineHeight: 19 },
    label: { color: palette.text, fontWeight: "800" },
    input: {
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.text,
      padding: 10
    },
    notesInput: {
      minHeight: 130,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.text,
      padding: 10,
      textAlignVertical: "top"
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: {
      borderRadius: 999,
      backgroundColor: palette.accentSoft,
      color: palette.success,
      fontWeight: "800",
      paddingHorizontal: 9,
      paddingVertical: 5,
      overflow: "hidden"
    },
    rejectedTag: {
      borderRadius: 999,
      backgroundColor: palette.surfaceMuted,
      color: palette.danger,
      fontWeight: "800",
      paddingHorizontal: 9,
      paddingVertical: 5,
      overflow: "hidden"
    },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    photoTile: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      overflow: "hidden",
      backgroundColor: palette.card
    },
    photoThumb: { width: "100%", height: 88, backgroundColor: palette.surfaceStrong },
    photoFallback: {
      height: 88,
      backgroundColor: palette.surfaceMuted,
      padding: 8,
      justifyContent: "center"
    },
    photoFallbackTitle: { color: palette.warning, fontWeight: "800", fontSize: 12 },
    photoFallbackText: { color: palette.warning, fontSize: 11, marginTop: 3 },
    photoMeta: { padding: 6, color: palette.textMuted, fontSize: 11, fontWeight: "700" },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontWeight: "800" },
    dangerButton: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    dangerButtonText: { color: palette.danger, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    feedback: {
      color: palette.textSoft,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700"
    }
  });
}
