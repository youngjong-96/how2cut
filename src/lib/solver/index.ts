import { z } from "zod";
import { searchOptimalBars } from "./exact";
import { solveWithBestFitDecreasing } from "./heuristic";
import { buildCutPlan } from "./patterns";
import type { CutItem, CutPiece, SolverInput, SolverResult } from "./types";

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
  timeLimitMs: z.number().int().min(100).max(5000),
  items: z.array(cutItemSchema).min(1)
});

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
  const heuristicBars = solveWithBestFitDecreasing(pieces, validInput.stockLength);
  const warnings: string[] = [];

  if (shouldSkipExactSearch(pieces)) {
    warnings.push("절단 조각이 많아 빠른 근사 계산 결과를 표시합니다.");

    const elapsedMs = Date.now() - startedAt;
    const plan = buildCutPlan(
      heuristicBars,
      validInput.stockLength,
      false,
      "heuristic",
      elapsedMs,
      warnings
    );

    return {
      plan,
      errors: [],
      warnings
    };
  }

  const exactResult = searchOptimalBars(
    pieces,
    validInput.stockLength,
    heuristicBars,
    validInput.timeLimitMs
  );

  if (exactResult.timedOut) {
    warnings.push("정확 탐색 시간이 초과되어 현재까지 찾은 빠른 계산 결과를 표시합니다.");
  }

  const elapsedMs = Date.now() - startedAt;
  const plan = buildCutPlan(
    exactResult.bars,
    validInput.stockLength,
    exactResult.isOptimal,
    exactResult.method,
    elapsedMs,
    warnings
  );

  return {
    plan,
    errors: [],
    warnings
  };
}
