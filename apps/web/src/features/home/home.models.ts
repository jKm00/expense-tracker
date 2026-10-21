export const homeWidgetTypes = ["quick_log", "shortcuts"] as const;
export type HomeWidgetType = (typeof homeWidgetTypes)[number];

export type HomeWidget = {
  type: HomeWidgetType;
  enabled: boolean;
};

export const defaultHomeWidgets: HomeWidget[] = [
  { type: "quick_log", enabled: true },
  { type: "shortcuts", enabled: false },
];
