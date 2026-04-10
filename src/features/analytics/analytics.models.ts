export type ComparisonDelta = {
  absolute: number; // current - comparison
  percentage: number; // ((current - comparison) / comparison) * 100, 0 when comparison is 0
  direction: "up" | "down" | "neutral";
  favorable: boolean; // context-dependent: expenses down = favorable, income up = favorable
};
