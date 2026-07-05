import type {
  GeneratedCutItem,
  GeneratedCutSource,
  MaterialGroup,
  SlidingSize,
  WindowCutCalculationResult,
  WindowSpecInput
} from "./types";

const materialGroupLabels: Record<MaterialGroup, string> = {
  frame: "프레임",
  sash: "창틀",
  screen: "방충망"
};

const sourceLabels: Record<GeneratedCutSource, string> = {
  "frame-width": "프레임 가로",
  "frame-height": "프레임 세로",
  "sash-top": "창틀 상바",
  "sash-roller": "창틀 로라바",
  "sash-hook": "창틀 고리",
  "sash-handle": "창틀 손잡이",
  "screen-width": "방충망 가로",
  "screen-height": "방충망 세로"
};

const sourceGroups: Record<GeneratedCutSource, MaterialGroup> = {
  "frame-width": "frame",
  "frame-height": "frame",
  "sash-top": "sash",
  "sash-roller": "sash",
  "sash-hook": "sash",
  "sash-handle": "sash",
  "screen-width": "screen",
  "screen-height": "screen"
};

const sourceOrder: GeneratedCutSource[] = [
  "frame-width",
  "frame-height",
  "sash-top",
  "sash-roller",
  "sash-hook",
  "sash-handle",
  "screen-width",
  "screen-height"
];

// 밀리미터 계산 결과를 현장 입력에 맞춰 자연수에 가까운 정수로 반올림한다.
export function roundMillimeter(value: number): number {
  return Math.round(value);
}

// 부품군 코드를 화면과 보고서에서 쓰는 한글 이름으로 바꾼다.
export function getMaterialGroupLabel(group: MaterialGroup): string {
  return materialGroupLabels[group];
}

// 미서기 규격별 창틀 가로 보정값을 반환한다.
function getSashWidthOffset(slidingSize: SlidingSize): number {
  return slidingSize === 92 ? 140 : 190;
}

// 미서기 규격별 창틀 세로 보정값을 반환한다.
function getSashHeightOffset(slidingSize: SlidingSize): number {
  return slidingSize === 92 ? 63 : 67;
}

// 미서기 규격별 방충망 가로 추가값을 반환한다.
function getScreenWidthAddition(slidingSize: SlidingSize): number {
  return slidingSize === 92 ? 60 : 100;
}

// 미서기 규격별 방충망 세로 보정값을 반환한다.
function getScreenHeightOffset(slidingSize: SlidingSize): number {
  return slidingSize === 92 ? 53 : 57;
}

// 계산 전 창문 규격 입력값이 산식에 사용할 수 있는 값인지 확인한다.
function validateWindowSpecInput(input: WindowSpecInput): string[] {
  const errors: string[] = [];

  if (input.windowType !== "double-even") {
    errors.push("현재는 정양쪽문만 계산할 수 있습니다.");
  }

  if (input.slidingSize !== 92 && input.slidingSize !== 115) {
    errors.push("미서기 규격은 92 또는 115 중 하나여야 합니다.");
  }

  if (!Number.isFinite(input.width) || input.width <= 0) {
    errors.push("가로 치수는 0보다 큰 숫자로 입력해야 합니다.");
  }

  if (!Number.isFinite(input.height) || input.height <= 0) {
    errors.push("세로 치수는 0보다 큰 숫자로 입력해야 합니다.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    errors.push("창문 수량은 1개 이상의 자연수로 입력해야 합니다.");
  }

  return errors;
}

// 원본 산식 한 줄을 절단 목록 항목으로 변환한다.
function createCutItem(
  source: GeneratedCutSource,
  length: number,
  quantity: number,
  formulaNote: string,
  mergeKey?: string
): GeneratedCutItem {
  const group = sourceGroups[source];

  return {
    id: `${source}-${length}`,
    group,
    groupLabel: getMaterialGroupLabel(group),
    mergeKey: mergeKey ?? `${group}:${length}`,
    sourceRank: sourceOrder.indexOf(source),
    sourceLabels: [sourceLabels[source]],
    formulaNotes: [formulaNote],
    length,
    quantity
  };
}

// 같은 부품군 안에서 같은 길이 항목을 합산해 작업자가 보기 쉬운 목록으로 만든다.
export function mergeGeneratedCutItems(items: GeneratedCutItem[]): GeneratedCutItem[] {
  const mergedItems = new Map<string, GeneratedCutItem>();

  for (const item of items) {
    const key = item.mergeKey;
    const existingItem = mergedItems.get(key);

    if (!existingItem) {
      mergedItems.set(key, { ...item });
      continue;
    }

    existingItem.quantity += item.quantity;
    existingItem.sourceLabels = Array.from(
      new Set([...existingItem.sourceLabels, ...item.sourceLabels])
    );
    existingItem.formulaNotes = Array.from(
      new Set([...existingItem.formulaNotes, ...item.formulaNotes])
    );
    existingItem.sourceRank = Math.min(existingItem.sourceRank, item.sourceRank);
  }

  return Array.from(mergedItems.values()).sort((left, right) => {
    const leftGroupIndex = Math.min(
      ...sourceOrder
        .map((source, index) => (sourceGroups[source] === left.group ? index : Number.POSITIVE_INFINITY))
        .filter((index) => Number.isFinite(index))
    );
    const rightGroupIndex = Math.min(
      ...sourceOrder
        .map((source, index) => (sourceGroups[source] === right.group ? index : Number.POSITIVE_INFINITY))
        .filter((index) => Number.isFinite(index))
    );

    if (leftGroupIndex !== rightGroupIndex) {
      return leftGroupIndex - rightGroupIndex;
    }

    if (left.sourceRank !== right.sourceRank) {
      return left.sourceRank - right.sourceRank;
    }

    return right.length - left.length;
  });
}

// 반올림 후 산출된 절단 길이가 실제 절단 가능한 자연수인지 확인한다.
function validateGeneratedLengths(items: GeneratedCutItem[]): string[] {
  return items
    .filter((item) => item.length <= 0)
    .map((item) => `${item.groupLabel} ${item.sourceLabels.join("/")} 길이가 0mm 이하입니다.`);
}

// 정양쪽문 산식에 따라 프레임, 창틀, 방충망 절단 목록을 계산한다.
export function calculateDoubleEvenCuts(input: WindowSpecInput): WindowCutCalculationResult {
  const validationErrors = validateWindowSpecInput(input);

  if (validationErrors.length > 0) {
    return {
      items: [],
      errors: validationErrors,
      warnings: []
    };
  }

  const sashWidthOffset = getSashWidthOffset(input.slidingSize);
  const sashHeightOffset = getSashHeightOffset(input.slidingSize);
  const screenWidthAddition = getScreenWidthAddition(input.slidingSize);
  const screenHeightOffset = getScreenHeightOffset(input.slidingSize);
  const sashWidth = roundMillimeter((input.width - sashWidthOffset) / 2);
  const sashHeight = roundMillimeter(input.height - sashHeightOffset);
  const screenWidth = roundMillimeter((input.width - sashWidthOffset) / 2 + screenWidthAddition);
  const screenHeight = roundMillimeter(input.height - screenHeightOffset);
  const rawItems: GeneratedCutItem[] = [
    createCutItem("frame-width", roundMillimeter(input.width), input.quantity * 2, "가로 x 창문수량 x 2"),
    createCutItem("frame-height", roundMillimeter(input.height), input.quantity * 2, "세로 x 창문수량 x 2"),
    createCutItem(
      "sash-top",
      sashWidth,
      input.quantity * 2,
      `상바: (가로 - ${sashWidthOffset}) / 2 x 창문수량 x 2`,
      `sash-top:${sashWidth}`
    ),
    createCutItem(
      "sash-roller",
      sashWidth,
      input.quantity * 2,
      `로라바: (가로 - ${sashWidthOffset}) / 2 x 창문수량 x 2`,
      `sash-roller:${sashWidth}`
    ),
    createCutItem(
      "sash-hook",
      sashHeight,
      input.quantity * 2,
      `고리: (세로 - ${sashHeightOffset}) x 창문수량 x 2`,
      `sash-hook:${sashHeight}`
    ),
    createCutItem(
      "sash-handle",
      sashHeight,
      input.quantity * 2,
      `손잡이: (세로 - ${sashHeightOffset}) x 창문수량 x 2`,
      `sash-handle:${sashHeight}`
    )
  ];

  if (input.hasScreen) {
    rawItems.push(
      createCutItem(
        "screen-width",
        screenWidth,
        input.quantity * 2,
        `((가로 - ${sashWidthOffset}) / 2 + ${screenWidthAddition}) x 창문수량 x 2`
      ),
      createCutItem(
        "screen-height",
        screenHeight,
        input.quantity * 2,
        `(세로 - ${screenHeightOffset}) x 창문수량 x 2`
      )
    );
  }

  const lengthErrors = validateGeneratedLengths(rawItems);

  return {
    items: lengthErrors.length > 0 ? [] : mergeGeneratedCutItems(rawItems),
    errors: lengthErrors,
    warnings: []
  };
}
