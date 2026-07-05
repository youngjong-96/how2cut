export type CutItem = {
  id: string;
  label?: string;
  length: number;
  quantity: number;
};

export type SolverInput = {
  stockLength: number;
  kerf: number;
  reusableRemainderLength?: number;
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

export type CutPlan = {
  bars: CutPlanBar[];
  patterns: CutPattern[];
  totalRequiredLength: number;
  totalConsumedLength: number;
  totalStockLength: number;
  totalRemainder: number;
  utilizationRate: number;
  isOptimal: boolean;
  method: "exact" | "heuristic";
  elapsedMs: number;
  warnings: string[];
};

export type SolverResult = {
  plan: CutPlan | null;
  errors: string[];
  warnings: string[];
};
