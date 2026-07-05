import {
  canPlacePiece,
  createEmptyBar,
  placePieceInBar,
  removePieceFromBar
} from "./heuristic";
import type { CutPiece, CutPlanBar } from "./types";

type ExactSearchResult = {
  bars: CutPlanBar[] | null;
  timedOut: boolean;
};

type SearchState = {
  deadline: number;
  suffixUsage: number[];
  timedOut: boolean;
};

// 남은 절단 조각의 누적 사용 길이를 계산한다.
function createSuffixUsage(pieces: CutPiece[]): number[] {
  const suffixUsage = new Array<number>(pieces.length + 1).fill(0);

  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    suffixUsage[index] = suffixUsage[index + 1] + pieces[index].usedLength;
  }

  return suffixUsage;
}

// 현재 탐색 상태를 중복 제거용 키로 만든다.
function createStateKey(pieceIndex: number, bars: CutPlanBar[]): string {
  const remainders = bars
    .map((bar) => bar.remainder)
    .sort((left, right) => left - right)
    .join(",");

  return `${pieceIndex}|${remainders}`;
}

// 현재 남은 조각들이 원자재 막대의 남은 공간에 들어갈 가능성이 있는지 빠르게 검사한다.
function canStillFitRemainingPieces(
  pieceIndex: number,
  pieces: CutPiece[],
  bars: CutPlanBar[],
  suffixUsage: number[]
): boolean {
  const totalRemainingSpace = bars.reduce((sum, bar) => sum + bar.remainder, 0);

  if (suffixUsage[pieceIndex] > totalRemainingSpace) {
    return false;
  }

  const nextPiece = pieces[pieceIndex];

  if (!nextPiece) {
    return true;
  }

  return bars.some((bar) => bar.remainder >= nextPiece.usedLength);
}

// 후보 원자재 막대를 남는 공간이 가장 적게 남는 순서로 정렬한다.
function getCandidateBarIndexes(piece: CutPiece, bars: CutPlanBar[]): number[] {
  return bars
    .map((bar, index) => ({
      index,
      remainderAfterCut: bar.remainder - piece.usedLength
    }))
    .filter((candidate) => candidate.remainderAfterCut >= 0)
    .sort((left, right) => left.remainderAfterCut - right.remainderAfterCut)
    .map((candidate) => candidate.index);
}

// 정해진 원자재 개수 안에서 모든 절단 조각을 배치할 수 있는지 깊이 우선 탐색한다.
function searchFixedBarCount(
  pieceIndex: number,
  pieces: CutPiece[],
  bars: CutPlanBar[],
  visitedStates: Set<string>,
  state: SearchState
): boolean {
  if (Date.now() > state.deadline) {
    state.timedOut = true;
    return false;
  }

  if (pieceIndex >= pieces.length) {
    return true;
  }

  if (!canStillFitRemainingPieces(pieceIndex, pieces, bars, state.suffixUsage)) {
    return false;
  }

  const stateKey = createStateKey(pieceIndex, bars);

  if (visitedStates.has(stateKey)) {
    return false;
  }

  const piece = pieces[pieceIndex];
  const triedRemainders = new Set<number>();
  const candidateBarIndexes = getCandidateBarIndexes(piece, bars);

  for (const barIndex of candidateBarIndexes) {
    const bar = bars[barIndex];

    if (triedRemainders.has(bar.remainder) || !canPlacePiece(bar, piece)) {
      continue;
    }

    triedRemainders.add(bar.remainder);
    placePieceInBar(bar, piece);

    if (searchFixedBarCount(pieceIndex + 1, pieces, bars, visitedStates, state)) {
      return true;
    }

    removePieceFromBar(bar, piece);

    if (state.timedOut) {
      return false;
    }
  }

  visitedStates.add(stateKey);
  return false;
}

// 특정 원자재 개수로 가능한 절단 배치를 찾는다.
function findBarsForCount(
  pieces: CutPiece[],
  stockLength: number,
  barCount: number,
  deadline: number
): ExactSearchResult {
  const bars = Array.from({ length: barCount }, (_, index) => createEmptyBar(index, stockLength));
  const state: SearchState = {
    deadline,
    suffixUsage: createSuffixUsage(pieces),
    timedOut: false
  };
  const found = searchFixedBarCount(0, pieces, bars, new Set<string>(), state);

  return {
    bars: found ? bars : null,
    timedOut: state.timedOut
  };
}

// 휴리스틱 해보다 적은 원자재 개수로 가능한 정확해를 탐색한다.
export function searchOptimalBars(
  pieces: CutPiece[],
  stockLength: number,
  heuristicBars: CutPlanBar[],
  timeLimitMs: number
): {
  bars: CutPlanBar[];
  isOptimal: boolean;
  method: "exact" | "heuristic";
  timedOut: boolean;
} {
  const totalUsedLength = pieces.reduce((sum, piece) => sum + piece.usedLength, 0);
  const lowerBound = Math.max(1, Math.ceil(totalUsedLength / stockLength));
  const upperBound = heuristicBars.length;
  const deadline = Date.now() + timeLimitMs;

  if (lowerBound >= upperBound) {
    return {
      bars: heuristicBars,
      isOptimal: true,
      method: "exact",
      timedOut: false
    };
  }

  for (let barCount = lowerBound; barCount < upperBound; barCount += 1) {
    const result = findBarsForCount(pieces, stockLength, barCount, deadline);

    if (result.bars) {
      return {
        bars: result.bars,
        isOptimal: true,
        method: "exact",
        timedOut: false
      };
    }

    if (result.timedOut) {
      return {
        bars: heuristicBars,
        isOptimal: false,
        method: "heuristic",
        timedOut: true
      };
    }
  }

  return {
    bars: heuristicBars,
    isOptimal: true,
    method: "exact",
    timedOut: false
  };
}
