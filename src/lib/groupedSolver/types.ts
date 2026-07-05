import type { OptimizationMode, CutPlan } from "../solver/types";
import type { GeneratedCutItem, MaterialGroup } from "../windowRules/types";

export type MaterialStockLengths = Partial<Record<MaterialGroup, number>>;

export type GroupedSolverInput = {
  items: GeneratedCutItem[];
  stockLengths: MaterialStockLengths;
  kerf: number;
  timeLimitMs: number;
  optimizationMode: OptimizationMode;
};

export type GroupedCutPlan = {
  group: MaterialGroup;
  groupLabel: string;
  stockLength: number;
  items: GeneratedCutItem[];
  plan: CutPlan;
};

export type GroupedSolverResult = {
  plans: GroupedCutPlan[];
  errors: string[];
  warnings: string[];
};
