import type { CutPattern, CutPlan, CutPlanBar } from "./types";
import { createScoredWorkPlan, normalizeBarsForWorkPlan } from "./workPlan";
import type { OptimizationMode } from "./types";

// 원자재 막대의 절단 패턴을 비교 가능한 문자열로 만든다.
export function createPatternSignature(bar: CutPlanBar): string {
  return bar.cuts
    .map((cut) => cut.length)
    .sort((left, right) => right - left)
    .join("+");
}

// 같은 절단 패턴을 묶어서 작업 지시용 요약을 만든다.
export function groupBarsByPattern(bars: CutPlanBar[]): CutPattern[] {
  const patternMap = new Map<string, CutPattern>();

  for (const bar of bars) {
    const cuts = bar.cuts.map((cut) => cut.length).sort((left, right) => right - left);
    const signature = cuts.join("+");
    const existingPattern = patternMap.get(signature);

    if (existingPattern) {
      existingPattern.count += 1;
    } else {
      patternMap.set(signature, {
        id: `pattern-${patternMap.size + 1}`,
        signature,
        cuts,
        count: 1,
        remainder: bar.remainder
      });
    }
  }

  return Array.from(patternMap.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.remainder - right.remainder;
  });
}

// 계산된 원자재 막대 목록을 화면에서 쓰기 좋은 계획 객체로 변환한다.
export function buildCutPlan(
  bars: CutPlanBar[],
  stockLength: number,
  isOptimal: boolean,
  method: "exact" | "heuristic" | "multi-criteria",
  optimizationMode: OptimizationMode,
  elapsedMs: number,
  warnings: string[]
): CutPlan {
  const visibleBars = normalizeBarsForWorkPlan(bars);
  const scoredWorkPlan = createScoredWorkPlan(visibleBars, optimizationMode);

  const totalRequiredLength = visibleBars.reduce(
    (sum, bar) => sum + bar.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0),
    0
  );
  const totalConsumedLength = visibleBars.reduce((sum, bar) => sum + bar.usedLength, 0);
  const totalStockLength = visibleBars.length * stockLength;
  const totalRemainder = visibleBars.reduce((sum, bar) => sum + bar.remainder, 0);
  const utilizationRate = totalStockLength === 0 ? 0 : totalRequiredLength / totalStockLength;

  return {
    bars: visibleBars,
    patterns: groupBarsByPattern(visibleBars),
    workSteps: scoredWorkPlan.workSteps,
    score: scoredWorkPlan.score,
    totalRequiredLength,
    totalConsumedLength,
    totalStockLength,
    totalRemainder,
    utilizationRate,
    isOptimal,
    method,
    optimizationMode,
    elapsedMs,
    warnings
  };
}
