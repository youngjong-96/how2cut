import { solveCutPlan } from "../solver";
import type { CutItem } from "../solver/types";
import { getMaterialGroupLabel } from "../windowRules";
import type { GeneratedCutItem, MaterialGroup } from "../windowRules/types";
import type { GroupedCutPlan, GroupedSolverInput, GroupedSolverResult } from "./types";

const materialGroupOrder: MaterialGroup[] = ["frame", "sash", "screen"];

// 부품군이 결과에 표시될 순서를 숫자로 바꾼다.
function getMaterialGroupOrder(group: MaterialGroup): number {
  return materialGroupOrder.indexOf(group);
}

// 산출된 절단 항목을 프레임, 창틀, 방충망 부품군별로 묶는다.
function groupItemsByMaterial(items: GeneratedCutItem[]): Map<MaterialGroup, GeneratedCutItem[]> {
  const groupedItems = new Map<MaterialGroup, GeneratedCutItem[]>();

  for (const item of items) {
    const groupItems = groupedItems.get(item.group) ?? [];

    groupItems.push(item);
    groupedItems.set(item.group, groupItems);
  }

  return groupedItems;
}

// 부품군별 산출 목록을 기존 단일 절단 솔버가 이해하는 입력 항목으로 바꾼다.
function convertGeneratedItemsToCutItems(items: GeneratedCutItem[]): CutItem[] {
  return items.map((item) => ({
    id: item.id,
    label: `${item.groupLabel} ${item.sourceLabels.join("/")}`,
    length: item.length,
    quantity: item.quantity
  }));
}

// 부품군별 원자재 길이가 실제 계산에 사용할 수 있는 값인지 확인한다.
function validateStockLength(group: MaterialGroup, stockLength: number | undefined): string | null {
  if (!Number.isFinite(stockLength) || !stockLength || stockLength <= 0) {
    return `${getMaterialGroupLabel(group)} 원자재 길이는 0보다 큰 숫자로 입력해야 합니다.`;
  }

  return null;
}

// 단일 부품군의 절단 계획을 기존 최적화 엔진으로 계산한다.
function solveMaterialGroup(
  input: GroupedSolverInput,
  group: MaterialGroup,
  items: GeneratedCutItem[]
): GroupedCutPlan | { errors: string[]; warnings: string[] } {
  const stockLength = input.stockLengths[group];
  const stockLengthError = validateStockLength(group, stockLength);
  const groupLabel = getMaterialGroupLabel(group);

  if (stockLengthError) {
    return {
      errors: [stockLengthError],
      warnings: []
    };
  }

  const validStockLength = stockLength as number;
  const result = solveCutPlan({
    stockLength: validStockLength,
    kerf: input.kerf,
    timeLimitMs: input.timeLimitMs,
    optimizationMode: input.optimizationMode,
    items: convertGeneratedItemsToCutItems(items)
  });

  if (!result.plan) {
    return {
      errors: result.errors.map((error) => `[${groupLabel}] ${error}`),
      warnings: result.warnings.map((warning) => `[${groupLabel}] ${warning}`)
    };
  }

  return {
    group,
    groupLabel,
    stockLength: validStockLength,
    items,
    plan: result.plan
  };
}

// 창문 산출 목록을 부품군별로 나누어 각기 다른 원자재 길이로 최적 절단 계획을 계산한다.
export function solveGroupedCutPlans(input: GroupedSolverInput): GroupedSolverResult {
  const groupedItems = groupItemsByMaterial(input.items);
  const plans: GroupedCutPlan[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const group of Array.from(groupedItems.keys()).sort(
    (left, right) => getMaterialGroupOrder(left) - getMaterialGroupOrder(right)
  )) {
    const groupItems = groupedItems.get(group) ?? [];
    const groupResult = solveMaterialGroup(input, group, groupItems);

    if ("plan" in groupResult) {
      plans.push(groupResult);
      warnings.push(...groupResult.plan.warnings.map((warning) => `[${groupResult.groupLabel}] ${warning}`));
      continue;
    }

    errors.push(...groupResult.errors);
    warnings.push(...groupResult.warnings);
  }

  return {
    plans,
    errors,
    warnings
  };
}

export type { GroupedCutPlan, GroupedSolverInput, GroupedSolverResult } from "./types";
