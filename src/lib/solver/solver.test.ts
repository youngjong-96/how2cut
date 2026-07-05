import { describe, expect, it } from "vitest";
import { solveCutPlan } from "./index";

describe("solveCutPlan", () => {
  it("간단한 절단 목록의 최적 원자재 개수를 계산한다", () => {
    const result = solveCutPlan({
      stockLength: 6000,
      kerf: 0,
      optimizationMode: "min-remainder",
      timeLimitMs: 1000,
      items: [
        { id: "a", length: 3000, quantity: 2 },
        { id: "b", length: 1500, quantity: 2 }
      ]
    });

    expect(result.errors).toEqual([]);
    expect(result.plan?.bars).toHaveLength(2);
    expect(result.plan?.isOptimal).toBe(true);
  });

  it("원자재보다 긴 절단 항목을 오류로 처리한다", () => {
    const result = solveCutPlan({
      stockLength: 1000,
      kerf: 0,
      timeLimitMs: 1000,
      items: [{ id: "a", length: 1200, quantity: 1 }]
    });

    expect(result.plan).toBeNull();
    expect(result.errors[0]).toContain("원자재보다 깁니다");
  });

  it("최소 길이 변경 우선 모드에서는 길이별 작업 순서를 만든다", () => {
    const result = solveCutPlan({
      stockLength: 6000,
      kerf: 0,
      optimizationMode: "min-length-changes",
      timeLimitMs: 1000,
      items: [
        { id: "a", length: 2000, quantity: 2 },
        { id: "b", length: 1000, quantity: 2 }
      ]
    });

    expect(result.errors).toEqual([]);
    expect(result.plan?.workSteps.every((step) => step.groupType === "length")).toBe(true);
    expect(result.plan?.score.lengthChangeCount).toBeLessThanOrEqual(1);
  });

  it("최소 원자재 변경 우선 모드에서는 원자재별 작업 순서를 만든다", () => {
    const result = solveCutPlan({
      stockLength: 3000,
      kerf: 0,
      optimizationMode: "min-stock-changes",
      timeLimitMs: 1000,
      items: [
        { id: "a", length: 1500, quantity: 2 },
        { id: "b", length: 1000, quantity: 2 }
      ]
    });

    expect(result.errors).toEqual([]);
    expect(result.plan?.workSteps.every((step) => step.groupType === "stock")).toBe(true);
    expect(result.plan?.score.stockChangeCount).toBe(Math.max(0, (result.plan?.bars.length ?? 1) - 1));
  });
});
