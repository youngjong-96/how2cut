export type WindowType = "double-even";

export type SlidingSize = 92 | 115;

export type MaterialGroup = "frame" | "sash" | "screen";

export type GeneratedCutSource =
  | "frame-width"
  | "frame-height"
  | "sash-top"
  | "sash-roller"
  | "sash-hook"
  | "sash-handle"
  | "screen-width"
  | "screen-height";

export type WindowSpecInput = {
  windowType: WindowType;
  slidingSize: SlidingSize;
  width: number;
  height: number;
  quantity: number;
  hasScreen: boolean;
};

export type GeneratedCutItem = {
  id: string;
  group: MaterialGroup;
  groupLabel: string;
  mergeKey: string;
  sourceRank: number;
  sourceLabels: string[];
  formulaNotes: string[];
  length: number;
  quantity: number;
};

export type WindowCutCalculationResult = {
  items: GeneratedCutItem[];
  errors: string[];
  warnings: string[];
};
