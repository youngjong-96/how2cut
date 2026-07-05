import type { CutPiece, CutPlanBar } from "./types";

// 새 원자재 막대를 생성한다.
export function createEmptyBar(index: number, stockLength: number): CutPlanBar {
  return {
    id: `bar-${index + 1}`,
    cuts: [],
    usedLength: 0,
    remainder: stockLength
  };
}

// 절단 조각을 원자재 막대에 배치한다.
export function placePieceInBar(bar: CutPlanBar, piece: CutPiece): void {
  bar.cuts.push(piece);
  bar.usedLength += piece.usedLength;
  bar.remainder -= piece.usedLength;
}

// 절단 조각을 원자재 막대에서 되돌린다.
export function removePieceFromBar(bar: CutPlanBar, piece: CutPiece): void {
  bar.cuts.pop();
  bar.usedLength -= piece.usedLength;
  bar.remainder += piece.usedLength;
}

// 원자재 막대 안에 절단 조각이 들어갈 수 있는지 확인한다.
export function canPlacePiece(bar: CutPlanBar, piece: CutPiece): boolean {
  return bar.remainder >= piece.usedLength;
}

// Best Fit Decreasing 방식으로 빠른 초기 절단 배치를 만든다.
export function solveWithBestFitDecreasing(
  pieces: CutPiece[],
  stockLength: number
): CutPlanBar[] {
  const bars: CutPlanBar[] = [];

  for (const piece of pieces) {
    let bestBarIndex = -1;
    let smallestRemainderAfterCut = Number.POSITIVE_INFINITY;

    for (let index = 0; index < bars.length; index += 1) {
      const bar = bars[index];
      const nextRemainder = bar.remainder - piece.usedLength;

      if (nextRemainder >= 0 && nextRemainder < smallestRemainderAfterCut) {
        bestBarIndex = index;
        smallestRemainderAfterCut = nextRemainder;
      }
    }

    if (bestBarIndex === -1) {
      const newBar = createEmptyBar(bars.length, stockLength);
      placePieceInBar(newBar, piece);
      bars.push(newBar);
    } else {
      placePieceInBar(bars[bestBarIndex], piece);
    }
  }

  return bars;
}
