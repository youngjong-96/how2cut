import type {
  CutPlanBar,
  CutPlanScore,
  CutWorkStep,
  CutWorkStepCut,
  OptimizationMode
} from "./types";

type WorkOperation = {
  length: number;
  barNumber: number;
};

type ScoredWorkPlan = {
  workSteps: CutWorkStep[];
  score: CutPlanScore;
};

// 원자재 막대 목록에서 실제 절단이 들어간 막대만 정규화한다.
export function normalizeBarsForWorkPlan(bars: CutPlanBar[]): CutPlanBar[] {
  return bars
    .filter((bar) => bar.cuts.length > 0)
    .map((bar, index) => ({
      ...bar,
      id: `bar-${index + 1}`,
      cuts: [...bar.cuts].sort((left, right) => right.length - left.length)
    }));
}

// 원자재 막대 번호를 사람이 읽기 쉬운 숫자로 변환한다.
function getBarNumber(barId: string, fallbackIndex: number): number {
  const matchedNumber = barId.match(/\d+$/)?.[0];

  return matchedNumber ? Number(matchedNumber) : fallbackIndex + 1;
}

// 같은 길이와 같은 원자재 절단 수량을 합산한다.
function addCutQuantity(
  targetMap: Map<string, CutWorkStepCut>,
  length: number,
  bar: CutPlanBar,
  barIndex: number
): void {
  const barNumber = getBarNumber(bar.id, barIndex);
  const key = `${length}:${bar.id}`;
  const existingCut = targetMap.get(key);

  if (existingCut) {
    existingCut.quantity += 1;
    return;
  }

  targetMap.set(key, {
    length,
    quantity: 1,
    barId: bar.id,
    barNumber
  });
}

// 길이별로 절단 작업을 묶어 줄자 세팅 변경을 줄이는 작업 순서를 만든다.
export function createLengthFirstWorkSteps(bars: CutPlanBar[]): CutWorkStep[] {
  const cutsByLength = new Map<number, Map<string, CutWorkStepCut>>();

  bars.forEach((bar, barIndex) => {
    for (const cut of bar.cuts) {
      const lengthCuts = cutsByLength.get(cut.length) ?? new Map<string, CutWorkStepCut>();
      addCutQuantity(lengthCuts, cut.length, bar, barIndex);
      cutsByLength.set(cut.length, lengthCuts);
    }
  });

  return Array.from(cutsByLength.entries())
    .sort(([leftLength], [rightLength]) => rightLength - leftLength)
    .map(([length, cutMap], index) => {
      const cuts = Array.from(cutMap.values()).sort(
        (left, right) => left.barNumber - right.barNumber
      );
      const totalQuantity = cuts.reduce((sum, cut) => sum + cut.quantity, 0);

      return {
        id: `work-length-${index + 1}`,
        order: index + 1,
        groupType: "length",
        title: `${length.toLocaleString("ko-KR")}mm 절단`,
        subtitle: `같은 길이 ${totalQuantity}개를 연속 절단`,
        length,
        totalQuantity,
        cuts
      };
    });
}

// 원자재별로 작업을 묶어 원자재 변경을 줄이는 작업 순서를 만든다.
export function createStockFirstWorkSteps(bars: CutPlanBar[]): CutWorkStep[] {
  return bars.map((bar, barIndex) => {
    const cutsByLength = new Map<number, CutWorkStepCut>();
    const barNumber = getBarNumber(bar.id, barIndex);

    for (const cut of bar.cuts) {
      const existingCut = cutsByLength.get(cut.length);

      if (existingCut) {
        existingCut.quantity += 1;
      } else {
        cutsByLength.set(cut.length, {
          length: cut.length,
          quantity: 1,
          barId: bar.id,
          barNumber
        });
      }
    }

    const cuts = Array.from(cutsByLength.values()).sort(
      (left, right) => right.length - left.length
    );
    const totalQuantity = cuts.reduce((sum, cut) => sum + cut.quantity, 0);

    return {
      id: `work-stock-${barIndex + 1}`,
      order: barIndex + 1,
      groupType: "stock",
      title: `원자재 ${barNumber}번 절단`,
      subtitle: `이 원자재에서 ${totalQuantity}개 절단 후 다음 원자재로 이동`,
      barId: bar.id,
      barNumber,
      totalQuantity,
      cuts
    };
  });
}

// 작업 순서 블록을 변경 횟수 계산용 단일 작업 목록으로 펼친다.
function flattenWorkOperations(workSteps: CutWorkStep[]): WorkOperation[] {
  return workSteps.flatMap((step) =>
    step.cuts.map((cut) => ({
      length: cut.length,
      barNumber: cut.barNumber
    }))
  );
}

// 연속 작업 사이에서 길이가 바뀐 횟수를 계산한다.
function countLengthChanges(operations: WorkOperation[]): number {
  return operations.reduce((count, operation, index) => {
    if (index === 0) {
      return count;
    }

    return operations[index - 1].length === operation.length ? count : count + 1;
  }, 0);
}

// 연속 작업 사이에서 원자재가 바뀐 횟수를 계산한다.
function countStockChanges(operations: WorkOperation[]): number {
  return operations.reduce((count, operation, index) => {
    if (index === 0) {
      return count;
    }

    return operations[index - 1].barNumber === operation.barNumber ? count : count + 1;
  }, 0);
}

// 원자재별 절단 구성을 비교해 서로 다른 반복 패턴 수를 계산한다.
function countDistinctPatterns(bars: CutPlanBar[]): number {
  const signatures = new Set(
    bars.map((bar) =>
      bar.cuts
        .map((cut) => cut.length)
        .sort((left, right) => right - left)
        .join("+")
    )
  );

  return signatures.size;
}

// 균형 우선 모드에서 서로 다른 단위의 점수를 비교 가능한 하나의 점수로 합친다.
function calculateWeightedScore(score: Omit<CutPlanScore, "weightedScore">): number {
  return (
    score.barCount * 1000 +
    score.totalRemainder * 0.02 +
    score.lengthChangeCount * 12 +
    score.stockChangeCount * 6 +
    score.patternCount * 3
  );
}

// 작업 순서와 원자재 배치 정보를 바탕으로 작업성 점수를 계산한다.
export function scoreWorkPlan(bars: CutPlanBar[], workSteps: CutWorkStep[]): CutPlanScore {
  const operations = flattenWorkOperations(workSteps);
  const scoreWithoutWeight = {
    barCount: bars.length,
    totalRemainder: bars.reduce((sum, bar) => sum + bar.remainder, 0),
    lengthChangeCount: countLengthChanges(operations),
    stockChangeCount: countStockChanges(operations),
    patternCount: countDistinctPatterns(bars)
  };

  return {
    ...scoreWithoutWeight,
    weightedScore: calculateWeightedScore(scoreWithoutWeight)
  };
}

// 최적화 모드에 맞는 작업 순서와 점수를 만든다.
export function createScoredWorkPlan(
  bars: CutPlanBar[],
  optimizationMode: OptimizationMode
): ScoredWorkPlan {
  const lengthFirstSteps = createLengthFirstWorkSteps(bars);
  const stockFirstSteps = createStockFirstWorkSteps(bars);
  const lengthFirstScore = scoreWorkPlan(bars, lengthFirstSteps);
  const stockFirstScore = scoreWorkPlan(bars, stockFirstSteps);

  if (optimizationMode === "min-stock-changes") {
    return {
      workSteps: stockFirstSteps,
      score: stockFirstScore
    };
  }

  if (optimizationMode === "balanced" && stockFirstScore.weightedScore < lengthFirstScore.weightedScore) {
    return {
      workSteps: stockFirstSteps,
      score: stockFirstScore
    };
  }

  return {
    workSteps: lengthFirstSteps,
    score: lengthFirstScore
  };
}

// 두 작업성 점수를 선택된 최적화 모드 기준으로 비교한다.
export function comparePlanScores(
  left: CutPlanScore,
  right: CutPlanScore,
  optimizationMode: OptimizationMode
): number {
  const comparatorsByMode: Record<OptimizationMode, Array<keyof CutPlanScore>> = {
    "min-remainder": [
      "barCount",
      "totalRemainder",
      "lengthChangeCount",
      "stockChangeCount",
      "patternCount"
    ],
    "min-length-changes": [
      "lengthChangeCount",
      "barCount",
      "totalRemainder",
      "stockChangeCount",
      "patternCount"
    ],
    "min-stock-changes": [
      "stockChangeCount",
      "barCount",
      "totalRemainder",
      "lengthChangeCount",
      "patternCount"
    ],
    balanced: [
      "weightedScore",
      "barCount",
      "totalRemainder",
      "lengthChangeCount",
      "stockChangeCount",
      "patternCount"
    ]
  };

  for (const key of comparatorsByMode[optimizationMode]) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }

  return 0;
}
