import { comparePlanScores, createScoredWorkPlan, normalizeBarsForWorkPlan } from "./workPlan";
import type { CutPlanBar, CutPlanScore, OptimizationMode } from "./types";

export type CutPlanCandidate = {
  id: string;
  source: "exact" | "heuristic";
  bars: CutPlanBar[];
  score: CutPlanScore;
};

// 후보 절단 계획을 중복 제거할 수 있는 서명 문자열로 변환한다.
function createCandidateSignature(bars: CutPlanBar[]): string {
  return normalizeBarsForWorkPlan(bars)
    .map((bar) =>
      bar.cuts
        .map((cut) => cut.length)
        .sort((left, right) => right - left)
        .join("+")
    )
    .sort()
    .join("|");
}

// 원자재 배치 후보에 작업성 점수를 붙인다.
function createScoredCandidate(
  id: string,
  source: "exact" | "heuristic",
  bars: CutPlanBar[],
  optimizationMode: OptimizationMode
): CutPlanCandidate {
  const normalizedBars = normalizeBarsForWorkPlan(bars);
  const scoredWorkPlan = createScoredWorkPlan(normalizedBars, optimizationMode);

  return {
    id,
    source,
    bars: normalizedBars,
    score: scoredWorkPlan.score
  };
}

// 여러 절단 후보를 중복 제거한 뒤 점수화한다.
export function createScoredCandidates(
  candidates: Array<{
    id: string;
    source: "exact" | "heuristic";
    bars: CutPlanBar[];
  }>,
  optimizationMode: OptimizationMode
): CutPlanCandidate[] {
  const seenSignatures = new Set<string>();
  const scoredCandidates: CutPlanCandidate[] = [];

  for (const candidate of candidates) {
    const signature = createCandidateSignature(candidate.bars);

    if (seenSignatures.has(signature)) {
      continue;
    }

    seenSignatures.add(signature);
    scoredCandidates.push(
      createScoredCandidate(candidate.id, candidate.source, candidate.bars, optimizationMode)
    );
  }

  return scoredCandidates;
}

// 선택된 최적화 모드 기준으로 가장 좋은 절단 후보를 고른다.
export function selectBestCandidate(
  candidates: CutPlanCandidate[],
  optimizationMode: OptimizationMode
): CutPlanCandidate {
  return candidates.reduce((bestCandidate, candidate) => {
    const comparison = comparePlanScores(candidate.score, bestCandidate.score, optimizationMode);

    if (comparison < 0) {
      return candidate;
    }

    if (comparison === 0 && candidate.source === "exact" && bestCandidate.source !== "exact") {
      return candidate;
    }

    return bestCandidate;
  }, candidates[0]);
}
