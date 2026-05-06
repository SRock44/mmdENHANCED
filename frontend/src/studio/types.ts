export type StudioColors = {
  primary: string;
  primaryText: string;
  secondary: string;
  tertiary: string;
  background: string;
  line: string;
  nodeBorder: string;
  nodeText: string;
  clusterBkg: string;
  titleColor: string;
};

export type StudioSettings = {
  theme: string;
  font: string;
  fontSize: number;
  curve: string;
  rankSep: number;
  nodeSep: number;
  padding: number;
  radius: number;
  stroke: number;
  edgeOp: number;
  htmlLabels: boolean;
  useMaxWidth: boolean;
  zoom: number;
  panX: number;
  panY: number;
  bg: string;
  colors: StudioColors;
};

export const defaultSettings = (): StudioSettings => ({
  theme: "default",
  font: "'trebuchet ms',verdana,arial",
  fontSize: 16,
  curve: "basis",
  rankSep: 50,
  nodeSep: 50,
  padding: 15,
  radius: 5,
  stroke: 1.5,
  edgeOp: 100,
  htmlLabels: true,
  useMaxWidth: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  bg: "white",
  colors: {
    primary: "#8b5cf6",
    primaryText: "#ffffff",
    secondary: "#06b6d4",
    tertiary: "#f59e0b",
    background: "#ffffff",
    line: "#64748b",
    nodeBorder: "#6d28d9",
    nodeText: "#1e293b",
    clusterBkg: "#f8f0fe",
    titleColor: "#1e293b",
  },
});

export function settingsFromJson(raw: unknown): StudioSettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const merge = { ...d, ...o } as StudioSettings;
  if (o.colors && typeof o.colors === "object") {
    merge.colors = { ...d.colors, ...(o.colors as StudioColors) };
  }
  return merge;
}
