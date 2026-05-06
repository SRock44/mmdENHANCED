import type { StudioSettings } from "./types";

export function getMermaidConfig(S: StudioSettings) {
  const isC = S.theme === "custom";
  return {
    startOnLoad: false,
    // Mermaid accepts several built-in theme names; keep string for presets like forest/dark.
    theme: (isC ? "base" : S.theme) as "base" | "default" | "dark" | "forest" | "neutral",
    themeVariables: isC
      ? {
          primaryColor: S.colors.primary,
          primaryTextColor: S.colors.primaryText,
          primaryBorderColor: S.colors.nodeBorder,
          lineColor: S.colors.line,
          secondaryColor: S.colors.secondary,
          tertiaryColor: S.colors.tertiary,
          background: S.colors.background,
          mainBkg: S.colors.primary,
          nodeTextColor: S.colors.nodeText,
          clusterBkg: S.colors.clusterBkg,
          titleColor: S.colors.titleColor,
          fontFamily: S.font,
          fontSize: `${S.fontSize}px`,
        }
      : { fontFamily: S.font, fontSize: `${S.fontSize}px` },
    flowchart: {
      curve: S.curve,
      rankSpacing: S.rankSep,
      nodeSpacing: S.nodeSep,
      padding: S.padding,
      htmlLabels: S.htmlLabels,
      useMaxWidth: S.useMaxWidth,
    },
    sequence: { useMaxWidth: S.useMaxWidth },
    fontFamily: S.font,
    fontSize: S.fontSize,
  };
}
