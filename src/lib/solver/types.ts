export type CutItem = {
  id: string;
  label?: string;
  length: number;
  quantity: number;
};

export type OptimizationMode =
  | "balanced"
  | "min-remainder"
  | "min-length-changes"
  | "min-stock-changes";

export type SolverInput = {
  stockLength: number;
  kerf: number;
  reusableRemainderLength?: number;
  optimizationMode?: OptimizationMode;
  timeLimitMs: number;
  items: CutItem[];
};

export type CutPiece = {
  id: string;
  sourceId: string;
  length: number;
  usedLength: number;
};

export type CutPlanBar = {
  id: string;
  cuts: CutPiece[];
  usedLength: number;
  remainder: number;
};

export type CutPattern = {
  id: string;
  signature: string;
  cuts: number[];
  count: number;
  remainder: number;
};

export type CutWorkStepCut = {
  length: number;
  quantity: number;
  barId: string;
  barNumber: number;
};

export type CutWorkStep = {
  id: string;
  order: number;
  groupType: "length" | "stock";
  title: string;
  subtitle: string;
  length?: number;
  barId?: string;
  barNumber?: number;
  totalQuantity: number;
  cuts: CutWorkStepCut[];
};

export type CutPlanScore = {
  barCount: number;
  totalRemainder: number;
  lengthChangeCount: number;
  stockChangeCount: number;
  patternCount: number;
  weightedScore: number;
};

export type CutPlan = {
  bars: CutPlanBar[];
  patterns: CutPattern[];
  workSteps: CutWorkStep[];
  score: CutPlanScore;
  totalRequiredLength: number;
  totalConsumedLength: number;
  totalStockLength: number;
  totalRemainder: number;
  utilizationRate: number;
  isOptimal: boolean;
  method: "exact" | "heuristic" | "multi-criteria";
  optimizationMode: OptimizationMode;
  elapsedMs: number;
  warnings: string[];
};

export type SolverResult = {
  plan: CutPlan | null;
  errors: string[];
  warnings: string[];
};
