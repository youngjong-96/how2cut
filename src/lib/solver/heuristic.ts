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

// First Fit Decreasing 방식으로 입력 순서에 가까운 절단 배치를 만든다.
export function solveWithFirstFitDecreasing(
  pieces: CutPiece[],
  stockLength: number
): CutPlanBar[] {
  const bars: CutPlanBar[] = [];

  for (const piece of pieces) {
    const targetBar = bars.find((bar) => canPlacePiece(bar, piece));

    if (targetBar) {
      placePieceInBar(targetBar, piece);
    } else {
      const newBar = createEmptyBar(bars.length, stockLength);
      placePieceInBar(newBar, piece);
      bars.push(newBar);
    }
  }

  return bars;
}

// 같은 길이의 절단 조각이 같은 원자재에 모이도록 우선 배치한다.
export function solveWithLengthClusteredFit(
  pieces: CutPiece[],
  stockLength: number
): CutPlanBar[] {
  const bars: CutPlanBar[] = [];

  for (const piece of pieces) {
    const barsWithSameLength = bars.filter(
      (bar) => bar.cuts.some((cut) => cut.length === piece.length) && canPlacePiece(bar, piece)
    );
    const candidateBars = barsWithSameLength.length > 0 ? barsWithSameLength : bars;
    let bestBar: CutPlanBar | null = null;
    let smallestRemainderAfterCut = Number.POSITIVE_INFINITY;

    for (const bar of candidateBars) {
      const nextRemainder = bar.remainder - piece.usedLength;

      if (nextRemainder >= 0 && nextRemainder < smallestRemainderAfterCut) {
        bestBar = bar;
        smallestRemainderAfterCut = nextRemainder;
      }
    }

    if (bestBar) {
      placePieceInBar(bestBar, piece);
    } else {
      const newBar = createEmptyBar(bars.length, stockLength);
      placePieceInBar(newBar, piece);
      bars.push(newBar);
    }
  }

  return bars;
}

// 하나의 원자재를 가능한 만큼 채운 뒤 다음 원자재로 넘어가는 배치를 만든다.
export function solveWithStockFocusedFit(
  pieces: CutPiece[],
  stockLength: number
): CutPlanBar[] {
  const remainingPieces = [...pieces];
  const bars: CutPlanBar[] = [];

  while (remainingPieces.length > 0) {
    const bar = createEmptyBar(bars.length, stockLength);
    let placedAtLeastOnePiece = true;

    while (placedAtLeastOnePiece) {
      placedAtLeastOnePiece = false;

      for (let index = 0; index < remainingPieces.length; index += 1) {
        const piece = remainingPieces[index];

        if (canPlacePiece(bar, piece)) {
          placePieceInBar(bar, piece);
          remainingPieces.splice(index, 1);
          placedAtLeastOnePiece = true;
          break;
        }
      }
    }

    bars.push(bar);
  }

  return bars;
}

// 여러 휴리스틱 절단 후보를 생성한다.
export function createHeuristicCandidates(
  pieces: CutPiece[],
  stockLength: number
): CutPlanBar[][] {
  return [
    solveWithBestFitDecreasing(pieces, stockLength),
    solveWithFirstFitDecreasing(pieces, stockLength),
    solveWithLengthClusteredFit(pieces, stockLength),
    solveWithStockFocusedFit(pieces, stockLength)
  ];
}
