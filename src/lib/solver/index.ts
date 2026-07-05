import { z } from "zod";
import { searchOptimalBars } from "./exact";
import { createHeuristicCandidates } from "./heuristic";
import { buildCutPlan } from "./patterns";
import { createScoredCandidates, selectBestCandidate } from "./selection";
import type { CutItem, CutPiece, OptimizationMode, SolverInput, SolverResult } from "./types";

const cutItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  length: z.number().finite().positive(),
  quantity: z.number().int().positive()
});

const solverInputSchema = z.object({
  stockLength: z.number().finite().positive(),
  kerf: z.number().finite().min(0),
  reusableRemainderLength: z.number().finite().min(0).optional(),
  optimizationMode: z
    .enum(["balanced", "min-remainder", "min-length-changes", "min-stock-changes"])
    .default("balanced"),
  timeLimitMs: z.number().int().min(100).max(5000),
  items: z.array(cutItemSchema).min(1)
});

type CandidateInput = {
  id: string;
  source: "exact" | "heuristic";
  bars: ReturnType<typeof createHeuristicCandidates>[number];
};

// 절단 손실을 포함해 조각 하나가 실제로 차지하는 길이를 계산한다.
export function calculateUsedLength(length: number, kerf: number): number {
  return length + kerf;
}

// 입력된 길이와 수량 목록을 개별 절단 조각 목록으로 펼친다.
export function expandCutItems(items: CutItem[], kerf: number): CutPiece[] {
  const pieces: CutPiece[] = [];

  for (const item of items) {
    for (let count = 0; count < item.quantity; count += 1) {
      pieces.push({
        id: `${item.id}-${count + 1}`,
        sourceId: item.id,
        length: item.length,
        usedLength: calculateUsedLength(item.length, kerf)
      });
    }
  }

  return pieces.sort((left, right) => {
    if (right.usedLength !== left.usedLength) {
      return right.usedLength - left.usedLength;
    }

    return right.length - left.length;
  });
}

// 검증 오류를 사용자에게 읽기 좋은 한국어 메시지로 바꾼다.
function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

// 원자재보다 긴 절단 조각이 있는지 확인한다.
function findOversizedItems(input: SolverInput): string[] {
  return input.items
    .filter((item) => calculateUsedLength(item.length, input.kerf) > input.stockLength)
    .map((item) => `${item.length}mm 항목은 절단 손실 포함 길이가 원자재보다 깁니다.`);
}

// 계산량이 큰 입력에서 정확 탐색을 건너뛸지 판단한다.
function shouldSkipExactSearch(pieces: CutPiece[]): boolean {
  return pieces.length > 64;
}

// 선택된 최적화 모드에 따라 결과 계산 방식을 표시할 값을 정한다.
function getPlanMethod(
  optimizationMode: OptimizationMode,
  selectedSource: "exact" | "heuristic",
  isExactOptimal: boolean
): "exact" | "heuristic" | "multi-criteria" {
  if (optimizationMode === "min-remainder" && selectedSource === "exact" && isExactOptimal) {
    return "exact";
  }

  if (optimizationMode === "min-remainder") {
    return "heuristic";
  }

  return "multi-criteria";
}

// 선택된 후보가 수학적 잔재 최소 최적해인지 판단한다.
function isSelectedExactOptimal(
  optimizationMode: OptimizationMode,
  selectedSource: "exact" | "heuristic",
  isExactOptimal: boolean
): boolean {
  return optimizationMode === "min-remainder" && selectedSource === "exact" && isExactOptimal;
}

// 절단 입력값을 검증하고 최적 또는 근사 절단 계획을 계산한다.
export function solveCutPlan(input: SolverInput): SolverResult {
  const startedAt = Date.now();
  const parsedInput = solverInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      plan: null,
      errors: formatValidationErrors(parsedInput.error),
      warnings: []
    };
  }

  const validInput = parsedInput.data;
  const oversizedErrors = findOversizedItems(validInput);

  if (oversizedErrors.length > 0) {
    return {
      plan: null,
      errors: oversizedErrors,
      warnings: []
    };
  }

  const pieces = expandCutItems(validInput.items, validInput.kerf);
  const optimizationMode = validInput.optimizationMode;
  const heuristicCandidates = createHeuristicCandidates(pieces, validInput.stockLength);
  const candidateInputs: CandidateInput[] = heuristicCandidates.map((bars, index) => ({
    id: `heuristic-${index + 1}`,
    source: "heuristic",
    bars
  }));
  const warnings: string[] = [];

  if (optimizationMode !== "min-remainder") {
    warnings.push("작업성 우선 기준에서는 잔재가 가장 적은 배치와 다른 결과가 선택될 수 있습니다.");
  }

  let exactSearchIsOptimal = false;
  let exactSearchTimedOut = false;

  if (!shouldSkipExactSearch(pieces)) {
    const exactResult = searchOptimalBars(
      pieces,
      validInput.stockLength,
      heuristicCandidates[0],
      validInput.timeLimitMs
    );

    exactSearchIsOptimal = exactResult.isOptimal;
    exactSearchTimedOut = exactResult.timedOut;

    if (exactResult.isOptimal) {
      candidateInputs.unshift({
        id: "exact-1",
        source: "exact",
        bars: exactResult.bars
      });
    }
  } else {
    warnings.push("절단 조각이 많아 빠른 근사 계산 결과를 표시합니다.");
  }

  if (exactSearchTimedOut) {
    warnings.push("정확 탐색 시간이 초과되어 현재까지 찾은 빠른 계산 후보를 비교합니다.");
  }

  const scoredCandidates = createScoredCandidates(candidateInputs, optimizationMode);
  const selectedCandidate = selectBestCandidate(scoredCandidates, optimizationMode);
  const isOptimal = isSelectedExactOptimal(
    optimizationMode,
    selectedCandidate.source,
    exactSearchIsOptimal
  );
  const method = getPlanMethod(optimizationMode, selectedCandidate.source, exactSearchIsOptimal);

  const elapsedMs = Date.now() - startedAt;
  const plan = buildCutPlan(
    selectedCandidate.bars,
    validInput.stockLength,
    isOptimal,
    method,
    optimizationMode,
    elapsedMs,
    warnings
  );

  return {
    plan,
    errors: [],
    warnings
  };
}
