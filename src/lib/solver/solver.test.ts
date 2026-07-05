import { describe, expect, it } from "vitest";
import { solveCutPlan } from "./index";

describe("solveCutPlan", () => {
  it("간단한 절단 목록의 최적 원자재 개수를 계산한다", () => {
    const result = solveCutPlan({
      stockLength: 6000,
      kerf: 0,
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
});
