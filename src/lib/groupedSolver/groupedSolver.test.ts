import { describe, expect, it } from "vitest";
import { solveGroupedCutPlans } from "./index";
import { calculateDoubleEvenCuts } from "../windowRules";

describe("solveGroupedCutPlans", () => {
  it("프레임, 창틀, 방충망을 서로 다른 원자재 길이로 각각 계산한다", () => {
    const calculation = calculateDoubleEvenCuts({
      windowType: "double-even",
      slidingSize: 92,
      width: 1800,
      height: 1200,
      quantity: 1,
      hasScreen: true
    });
    const result = solveGroupedCutPlans({
      items: calculation.items,
      stockLengths: {
        frame: 6300,
        sash: 6300,
        screen: 6300
      },
      kerf: 0,
      timeLimitMs: 1000,
      optimizationMode: "min-remainder"
    });

    expect(result.errors).toEqual([]);
    expect(result.plans.map((plan) => plan.group)).toEqual(["frame", "sash", "screen"]);
    expect(result.plans.every((plan) => plan.stockLength === 6300)).toBe(true);
    expect(result.plans.every((plan) => plan.plan.bars.length > 0)).toBe(true);
  });

  it("부품군별 원자재 길이가 없으면 해당 부품군 오류를 반환한다", () => {
    const calculation = calculateDoubleEvenCuts({
      windowType: "double-even",
      slidingSize: 92,
      width: 1800,
      height: 1200,
      quantity: 1,
      hasScreen: false
    });
    const result = solveGroupedCutPlans({
      items: calculation.items,
      stockLengths: {
        frame: 6300
      },
      kerf: 0,
      timeLimitMs: 1000,
      optimizationMode: "min-remainder"
    });

    expect(result.plans.map((plan) => plan.group)).toEqual(["frame"]);
    expect(result.errors[0]).toContain("창틀 원자재 길이");
  });
});
