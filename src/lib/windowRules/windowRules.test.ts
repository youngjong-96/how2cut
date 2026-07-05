import { describe, expect, it } from "vitest";
import { calculateDoubleEvenCuts } from "./index";

describe("calculateDoubleEvenCuts", () => {
  it("정양쪽문 미서기 92 규격의 프레임, 창틀, 방충망 절단 목록을 계산한다", () => {
    const result = calculateDoubleEvenCuts({
      windowType: "double-even",
      slidingSize: 92,
      width: 1801,
      height: 1200,
      quantity: 2,
      hasScreen: true
    });

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: "frame",
          length: 1801,
          quantity: 4
        }),
        expect.objectContaining({
          group: "frame",
          length: 1200,
          quantity: 4
        }),
        expect.objectContaining({
          group: "sash",
          length: 831,
          quantity: 4,
          sourceLabels: ["창틀 상바"]
        }),
        expect.objectContaining({
          group: "sash",
          length: 831,
          quantity: 4,
          sourceLabels: ["창틀 로라바"]
        }),
        expect.objectContaining({
          group: "sash",
          length: 1137,
          quantity: 4,
          sourceLabels: ["창틀 고리"]
        }),
        expect.objectContaining({
          group: "sash",
          length: 1137,
          quantity: 4,
          sourceLabels: ["창틀 손잡이"]
        }),
        expect.objectContaining({
          group: "screen",
          length: 891,
          quantity: 4
        }),
        expect.objectContaining({
          group: "screen",
          length: 1147,
          quantity: 4
        })
      ])
    );
  });

  it("정양쪽문 창틀 가로와 세로를 상바, 로라바, 고리, 손잡이로 나눠 표시한다", () => {
    const result = calculateDoubleEvenCuts({
      windowType: "double-even",
      slidingSize: 92,
      width: 1800,
      height: 1200,
      quantity: 1,
      hasScreen: false
    });
    const sashItems = result.items.filter((item) => item.group === "sash");

    expect(sashItems).toEqual([
      expect.objectContaining({
        sourceLabels: ["창틀 상바"],
        length: 830,
        quantity: 2
      }),
      expect.objectContaining({
        sourceLabels: ["창틀 로라바"],
        length: 830,
        quantity: 2
      }),
      expect.objectContaining({
        sourceLabels: ["창틀 고리"],
        length: 1137,
        quantity: 2
      }),
      expect.objectContaining({
        sourceLabels: ["창틀 손잡이"],
        length: 1137,
        quantity: 2
      })
    ]);
  });

  it("같은 부품군 안에서 같은 길이가 나오면 수량을 합산한다", () => {
    const result = calculateDoubleEvenCuts({
      windowType: "double-even",
      slidingSize: 115,
      width: 1000,
      height: 1000,
      quantity: 1,
      hasScreen: false
    });
    const frameItems = result.items.filter((item) => item.group === "frame");

    expect(frameItems).toHaveLength(1);
    expect(frameItems[0]).toEqual(
      expect.objectContaining({
        length: 1000,
        quantity: 4,
        sourceLabels: ["프레임 가로", "프레임 세로"]
      })
    );
  });
});
