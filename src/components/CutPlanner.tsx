"use client";

import { useEffect, useState, useRef } from "react";
import { CutInputForm, type FormCutItem } from "./CutInputForm";
import { CutPlanSummary } from "./CutPlanSummary";
import { CutPlanVisualizer } from "./CutPlanVisualizer";
import { GeneratedCutList } from "./GeneratedCutList";
import { GroupedCutPlanResults } from "./GroupedCutPlanResults";
import { PatternSummary } from "./PatternSummary";
import { PrintCutReport } from "./PrintCutReport";
import { PrintGeneratedCutListReport } from "./PrintGeneratedCutListReport";
import { PrintWindowCutReport } from "./PrintWindowCutReport";
import { WindowInputForm, type WindowFormState } from "./WindowInputForm";
import { WorkStepSummary } from "./WorkStepSummary";
import { calculateDoubleEvenCuts } from "@/lib/windowRules";
import type { GeneratedCutItem, SlidingSize, WindowSpecInput } from "@/lib/windowRules";
import type { GroupedSolverInput, GroupedSolverResult } from "@/lib/groupedSolver";
import type { CutPlan, OptimizationMode, SolverInput, SolverResult } from "@/lib/solver/types";

type InputMode = "direct" | "window";

type PlannerFormState = {
  stockLength: string;
  kerf: string;
  timeLimitMs: string;
  optimizationMode: OptimizationMode;
  items: FormCutItem[];
};

type SolverWorkerResponse =
  | {
      type: "result";
      requestId: string;
      result: SolverResult;
    }
  | {
      type: "grouped-result";
      requestId: string;
      result: GroupedSolverResult;
    }
  | {
      type: "error";
      requestId: string;
      error: string;
    };

const directStorageKey = "how2cut-form-v1";
const windowStorageKey = "how2cut-window-form-v1";
const inputModeStorageKey = "how2cut-input-mode-v2";

// 절단 계산 전용 Web Worker 인스턴스를 생성한다.
function createSolverWorker(): Worker {
  return new Worker(new URL("../workers/solver.worker.ts", import.meta.url), {
    type: "module"
  });
}

// 워커 응답과 현재 요청을 연결할 고유 요청 ID를 만든다.
function createSolverRequestId(): string {
  return `solve-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 브라우저 이벤트에서 새 절단 항목에 사용할 고유 ID를 만든다.
function createId(): string {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 비어 있는 직접 입력 절단 항목 행을 만든다.
function createEmptyItem(): FormCutItem {
  return {
    id: createId(),
    length: "",
    quantity: "1"
  };
}

// 직접 입력 모드에서 처음 보여줄 예시 상태를 만든다.
function createExampleState(): PlannerFormState {
  return {
    stockLength: "6000",
    kerf: "0",
    timeLimitMs: "1200",
    optimizationMode: "min-remainder",
    items: [
      { id: "example-1", length: "2400", quantity: "2" },
      { id: "example-2", length: "1800", quantity: "3" },
      { id: "example-3", length: "1200", quantity: "2" },
      { id: "example-4", length: "900", quantity: "4" }
    ]
  };
}

// 창문 정보 모드에서 처음 보여줄 기본 입력 상태를 만든다.
function createWindowExampleState(): WindowFormState {
  return {
    windowType: "double-even",
    slidingSize: 92,
    width: "1800",
    height: "1200",
    quantity: "1",
    hasScreen: true,
    frameStockLength: "6300",
    sashStockLength: "6300",
    screenStockLength: "6300",
    kerf: "0",
    timeLimitMs: "1200",
    optimizationMode: "min-remainder"
  };
}

// 문자열 값이 지원하는 입력 모드인지 확인한다.
function isInputMode(value: unknown): value is InputMode {
  return value === "direct" || value === "window";
}

// 문자열 값이 지원하는 최적화 모드인지 확인한다.
function isOptimizationMode(value: unknown): value is OptimizationMode {
  return (
    value === "balanced" ||
    value === "min-remainder" ||
    value === "min-length-changes" ||
    value === "min-stock-changes"
  );
}

// 저장된 미서기 규격 값을 안전한 숫자 규격으로 복원한다.
function normalizeSlidingSize(value: unknown): SlidingSize {
  return value === 115 ? 115 : 92;
}

// 저장된 직접 입력 상태에서 누락된 필드를 기본값으로 보강한다.
function normalizeFormState(form: Partial<PlannerFormState>): PlannerFormState {
  return {
    stockLength: form.stockLength ?? "6000",
    kerf: form.kerf ?? "0",
    timeLimitMs: form.timeLimitMs ?? "1200",
    optimizationMode: isOptimizationMode(form.optimizationMode) ? form.optimizationMode : "min-remainder",
    items: form.items && form.items.length > 0 ? form.items : [createEmptyItem()]
  };
}

// 저장된 창문 입력 상태에서 누락된 필드를 기본값으로 보강한다.
function normalizeWindowFormState(form: Partial<WindowFormState>): WindowFormState {
  return {
    windowType: "double-even",
    slidingSize: normalizeSlidingSize(form.slidingSize),
    width: form.width ?? "1800",
    height: form.height ?? "1200",
    quantity: form.quantity ?? "1",
    hasScreen: typeof form.hasScreen === "boolean" ? form.hasScreen : true,
    frameStockLength: form.frameStockLength ?? "6300",
    sashStockLength: form.sashStockLength ?? "6300",
    screenStockLength: form.screenStockLength ?? "6300",
    kerf: form.kerf ?? "0",
    timeLimitMs: form.timeLimitMs ?? "1200",
    optimizationMode: isOptimizationMode(form.optimizationMode) ? form.optimizationMode : "min-remainder"
  };
}

// 문자열 입력값을 계산 엔진이 사용하는 숫자로 변환한다.
function parseNumericInput(value: string): number {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return Number.NaN;
  }

  return Number(normalizedValue);
}

// 직접 입력 폼 상태를 기존 단일 절단 솔버 입력으로 변환한다.
function buildSolverInputFromForm(form: PlannerFormState): SolverInput {
  return {
    stockLength: parseNumericInput(form.stockLength),
    kerf: parseNumericInput(form.kerf || "0"),
    timeLimitMs: Math.round(parseNumericInput(form.timeLimitMs || "1200")),
    optimizationMode: form.optimizationMode,
    items: form.items.map((item) => ({
      id: item.id,
      length: parseNumericInput(item.length),
      quantity: Math.round(parseNumericInput(item.quantity))
    }))
  };
}

// 창문 입력 폼 상태를 정양쪽문 산식 입력으로 변환한다.
function buildWindowSpecInputFromForm(form: WindowFormState): WindowSpecInput {
  return {
    windowType: form.windowType,
    slidingSize: form.slidingSize,
    width: parseNumericInput(form.width),
    height: parseNumericInput(form.height),
    quantity: Math.round(parseNumericInput(form.quantity)),
    hasScreen: form.hasScreen
  };
}

// 창문 산출 목록과 원자재 조건을 부품군별 솔버 입력으로 변환한다.
function buildGroupedSolverInputFromWindowForm(
  form: WindowFormState,
  items: GeneratedCutItem[]
): GroupedSolverInput {
  return {
    items,
    stockLengths: {
      frame: parseNumericInput(form.frameStockLength),
      sash: parseNumericInput(form.sashStockLength),
      screen: parseNumericInput(form.screenStockLength)
    },
    kerf: parseNumericInput(form.kerf || "0"),
    timeLimitMs: Math.round(parseNumericInput(form.timeLimitMs || "1200")),
    optimizationMode: form.optimizationMode
  };
}

// 현재 직접 입력 상태를 공유용 쿼리 문자열로 변환한다.
function encodeShareState(form: PlannerFormState): string {
  const params = new URLSearchParams();
  const items = form.items
    .filter((item) => item.length.trim() && item.quantity.trim())
    .map((item) => `${item.length.trim()}x${item.quantity.trim()}`)
    .join(",");

  params.set("stock", form.stockLength);
  params.set("kerf", form.kerf);
  params.set("time", form.timeLimitMs);
  params.set("mode", form.optimizationMode);
  params.set("items", items);

  return params.toString();
}

// 공유 URL의 쿼리 문자열을 직접 입력 상태로 복원한다.
function decodeShareState(search: string): PlannerFormState | null {
  const params = new URLSearchParams(search);
  const stockLength = params.get("stock");
  const itemsParam = params.get("items");
  const modeParam = params.get("mode");

  if (!stockLength || !itemsParam) {
    return null;
  }

  const items = itemsParam
    .split(",")
    .map((entry, index) => {
      const [length, quantity] = entry.split("x");

      return {
        id: `shared-${index + 1}`,
        length: length ?? "",
        quantity: quantity ?? "1"
      };
    })
    .filter((item) => item.length);

  if (items.length === 0) {
    return null;
  }

  return {
    stockLength,
    kerf: params.get("kerf") ?? "0",
    timeLimitMs: params.get("time") ?? "1200",
    optimizationMode: isOptimizationMode(modeParam) ? modeParam : "min-remainder",
    items
  };
}

// 단일 절단 계획을 클립보드에 복사하기 좋은 텍스트로 변환한다.
function formatPlanForClipboard(plan: CutPlan): string {
  const barLines = plan.bars.map((bar, index) => {
    const cuts = bar.cuts.map((cut) => `${cut.length}mm`).join(" + ");

    return `원자재 ${index + 1}: ${cuts} / 남음 ${Math.round(bar.remainder)}mm`;
  });

  return [
    `필요 원자재: ${plan.bars.length}개`,
    `총 여유 길이: ${Math.round(plan.totalRemainder)}mm`,
    `사용률: ${Math.round(plan.utilizationRate * 1000) / 10}%`,
    `길이 변경: ${plan.score.lengthChangeCount}회`,
    `원자재 변경: ${plan.score.stockChangeCount}회`,
    "",
    "[작업 순서]",
    ...plan.workSteps.map((step) => {
      const cuts = step.cuts
        .map((cut) => `원자재 ${cut.barNumber}번 ${cut.quantity}개`)
        .join(", ");

      return `${step.order}. ${step.title}: ${cuts}`;
    }),
    "",
    "[원자재별 배치]",
    ...barLines
  ].join("\n");
}

// 부품군별 절단 계획을 클립보드에 복사하기 좋은 텍스트로 변환한다.
function formatGroupedPlanForClipboard(result: GroupedSolverResult): string {
  const groupLines = result.plans.flatMap((groupPlan) => [
    "",
    `[${groupPlan.groupLabel}]`,
    `원자재 길이: ${groupPlan.stockLength}mm`,
    `필요 원자재: ${groupPlan.plan.bars.length}개`,
    `총 여유 길이: ${Math.round(groupPlan.plan.totalRemainder)}mm`,
    ...groupPlan.plan.workSteps.map((step) => {
      const cuts = step.cuts
        .map((cut) => `원자재 ${cut.barNumber}번 ${cut.quantity}개`)
        .join(", ");

      return `${step.order}. ${step.title}: ${cuts}`;
    })
  ]);

  return ["창문 절단 계획", ...groupLines].join("\n");
}

// 직접 입력과 창문 정보 입력, 계산 결과 표시 흐름을 관리한다.
export function CutPlanner() {
  const [inputMode, setInputMode] = useState<InputMode>("window");
  const [form, setForm] = useState<PlannerFormState>(createExampleState);
  const [windowForm, setWindowForm] = useState<WindowFormState>(createWindowExampleState);
  const [plan, setPlan] = useState<CutPlan | null>(null);
  const [groupedResult, setGroupedResult] = useState<GroupedSolverResult | null>(null);
  const [lastWindowGeneratedItems, setLastWindowGeneratedItems] = useState<GeneratedCutItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const windowCalculation = calculateDoubleEvenCuts(buildWindowSpecInputFromForm(windowForm));
  const windowPreviewItems = windowCalculation.errors.length > 0 ? [] : windowCalculation.items;

  // 저장된 입력값 또는 공유 URL을 초기 상태로 불러온다.
  useEffect(() => {
    const sharedState = decodeShareState(window.location.search);

    if (sharedState) {
      setInputMode("direct");
      setForm(normalizeFormState(sharedState));
      return;
    }

    const savedMode = window.localStorage.getItem(inputModeStorageKey);
    const savedDirectState = window.localStorage.getItem(directStorageKey);
    const savedWindowState = window.localStorage.getItem(windowStorageKey);

    if (isInputMode(savedMode)) {
      setInputMode(savedMode);
    }

    if (savedDirectState) {
      setForm(normalizeFormState(JSON.parse(savedDirectState) as Partial<PlannerFormState>));
    }

    if (savedWindowState) {
      setWindowForm(
        normalizeWindowFormState(JSON.parse(savedWindowState) as Partial<WindowFormState>)
      );
    }
  }, []);

  // 직접 입력값이 바뀔 때 다음 방문을 위해 브라우저에 저장한다.
  useEffect(() => {
    window.localStorage.setItem(directStorageKey, JSON.stringify(form));
  }, [form]);

  // 창문 입력값이 바뀔 때 다음 방문을 위해 브라우저에 저장한다.
  useEffect(() => {
    window.localStorage.setItem(windowStorageKey, JSON.stringify(windowForm));
  }, [windowForm]);

  // 입력 모드가 바뀔 때 다음 방문을 위해 브라우저에 저장한다.
  useEffect(() => {
    window.localStorage.setItem(inputModeStorageKey, inputMode);
  }, [inputMode]);

  // 컴포넌트가 사라질 때 실행 중인 계산 워커를 정리한다.
  useEffect(() => {
    // 언마운트 시 워커 프로세스를 종료한다.
    function cleanupSolverWorker(): void {
      resetSolverWorker();
    }

    return cleanupSolverWorker;
  }, []);

  // 현재 워커를 종료하고 요청 참조를 초기화한다.
  function resetSolverWorker(): void {
    workerRef.current?.terminate();
    workerRef.current = null;
    activeRequestIdRef.current = null;
  }

  // 재사용 가능한 계산 워커를 가져오거나 새로 만든다.
  function getSolverWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = createSolverWorker();
    }

    return workerRef.current;
  }

  // 입력 모드를 바꾸고 모드 전환 중 표시되는 임시 메시지를 정리한다.
  function handleInputModeChange(nextMode: InputMode): void {
    if (inputMode === nextMode) {
      return;
    }

    resetSolverWorker();
    setInputMode(nextMode);
    setIsSolving(false);
    setErrors([]);
    setMessage("");
  }

  // 직접 입력 모드의 원자재 길이 값을 갱신한다.
  function handleStockLengthChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, stockLength: value }));
    setMessage("");
  }

  // 직접 입력 모드의 절단 손실 값을 갱신한다.
  function handleKerfChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, kerf: value }));
    setMessage("");
  }

  // 직접 입력 모드의 계산 제한 시간을 갱신한다.
  function handleTimeLimitMsChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, timeLimitMs: value }));
    setMessage("");
  }

  // 직접 입력 모드의 최적화 기준을 갱신하고 기존 결과가 있으면 즉시 다시 계산한다.
  function handleOptimizationModeChange(value: OptimizationMode): void {
    const nextForm = {
      ...form,
      optimizationMode: value
    };

    setForm(nextForm);
    setMessage("");

    if (plan || isSolving) {
      runDirectSolver(nextForm);
    }
  }

  // 직접 입력 모드의 특정 절단 항목 값을 갱신한다.
  function handleItemChange(
    id: string,
    field: keyof Omit<FormCutItem, "id">,
    value: string
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
    setMessage("");
  }

  // 직접 입력 모드에 새 절단 항목 행을 추가한다.
  function handleAddItem(): void {
    setForm((currentForm) => ({
      ...currentForm,
      items: [...currentForm.items, createEmptyItem()]
    }));
    setMessage("");
  }

  // 직접 입력 모드의 선택한 절단 항목 행을 복제한다.
  function handleDuplicateItem(id: string): void {
    setForm((currentForm) => {
      const itemToDuplicate = currentForm.items.find((item) => item.id === id);

      if (!itemToDuplicate) {
        return currentForm;
      }

      return {
        ...currentForm,
        items: [
          ...currentForm.items,
          {
            ...itemToDuplicate,
            id: createId()
          }
        ]
      };
    });
    setMessage("");
  }

  // 직접 입력 모드의 선택한 절단 항목 행을 삭제한다.
  function handleRemoveItem(id: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      items:
        currentForm.items.length > 1
          ? currentForm.items.filter((item) => item.id !== id)
          : [createEmptyItem()]
    }));
    setMessage("");
  }

  // 직접 입력 모드의 예시 데이터를 다시 채운다.
  function handleLoadExample(): void {
    setForm(createExampleState());
    setPlan(null);
    setErrors([]);
    setLastCalculatedAt(null);
    setMessage("예시 데이터를 불러왔습니다.");
  }

  // 현재 직접 입력값으로 절단 계획 계산을 시작한다.
  function handleSolve(): void {
    runDirectSolver(form);
  }

  // 창문 정보 모드의 입력 필드를 갱신한다.
  function handleWindowFieldChange<Key extends keyof WindowFormState>(
    field: Key,
    value: WindowFormState[Key]
  ): void {
    setWindowForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
    setGroupedResult(null);
    setLastWindowGeneratedItems([]);
    setLastCalculatedAt(null);
    setErrors([]);
    setMessage("");
  }

  // 창문 정보 모드의 최적화 기준을 갱신하고 기존 결과가 있으면 즉시 다시 계산한다.
  function handleWindowOptimizationModeChange(value: OptimizationMode): void {
    const nextForm = {
      ...windowForm,
      optimizationMode: value
    };

    setWindowForm(nextForm);
    setMessage("");

    if (groupedResult || isSolving) {
      runWindowSolver(nextForm);
    }
  }

  // 현재 창문 입력값으로 부품군별 절단 계획 계산을 시작한다.
  function handleWindowSolve(): void {
    runWindowSolver(windowForm);
  }

  // 워커 오류가 발생했을 때 공통 상태를 오류 표시 상태로 바꾼다.
  function handleWorkerError(requestId: string): void {
    if (requestId !== activeRequestIdRef.current) {
      return;
    }

    setIsSolving(false);
    activeRequestIdRef.current = null;
    setPlan(null);
    setGroupedResult(null);
    setErrors(["계산 워커에서 오류가 발생했습니다. 다시 시도해주세요."]);
    setMessage("");
    resetSolverWorker();
  }

  // 전달받은 직접 입력 상태로 단일 절단 계획 계산을 실행한다.
  function runDirectSolver(formState: PlannerFormState): void {
    resetSolverWorker();

    const worker = getSolverWorker();
    const requestId = createSolverRequestId();

    activeRequestIdRef.current = requestId;
    setIsSolving(true);
    setGroupedResult(null);
    setErrors([]);
    setMessage("계산 중입니다.");

    worker.onmessage = (event: MessageEvent<SolverWorkerResponse>) => {
      const response = event.data;

      if (response.requestId !== activeRequestIdRef.current) {
        return;
      }

      setIsSolving(false);
      activeRequestIdRef.current = null;

      if (response.type === "error") {
        setPlan(null);
        setErrors([response.error]);
        setMessage("");
        return;
      }

      if (response.type !== "result") {
        return;
      }

      setPlan(response.result.plan);
      setErrors(response.result.errors);
      setLastCalculatedAt(response.result.plan ? new Date() : null);
      setMessage(response.result.plan ? "계산이 완료되었습니다." : "");
    };

    worker.onerror = () => handleWorkerError(requestId);

    worker.postMessage({
      type: "solve",
      requestId,
      input: buildSolverInputFromForm(formState)
    });
  }

  // 전달받은 창문 입력 상태로 부품군별 절단 계획 계산을 실행한다.
  function runWindowSolver(formState: WindowFormState): void {
    const calculation = calculateDoubleEvenCuts(buildWindowSpecInputFromForm(formState));

    if (calculation.errors.length > 0) {
      resetSolverWorker();
      setIsSolving(false);
      setGroupedResult(null);
      setErrors(calculation.errors);
      setMessage("");
      return;
    }

    resetSolverWorker();

    const worker = getSolverWorker();
    const requestId = createSolverRequestId();

    activeRequestIdRef.current = requestId;
    setIsSolving(true);
    setPlan(null);
    setErrors([]);
    setMessage("계산 중입니다.");

    worker.onmessage = (event: MessageEvent<SolverWorkerResponse>) => {
      const response = event.data;

      if (response.requestId !== activeRequestIdRef.current) {
        return;
      }

      setIsSolving(false);
      activeRequestIdRef.current = null;

      if (response.type === "error") {
        setGroupedResult(null);
        setErrors([response.error]);
        setMessage("");
        return;
      }

      if (response.type !== "grouped-result") {
        return;
      }

      setGroupedResult(response.result);
      setErrors(response.result.errors);
      setLastWindowGeneratedItems(calculation.items);
      setLastCalculatedAt(response.result.plans.length > 0 ? new Date() : null);
      setMessage(response.result.plans.length > 0 ? "계산이 완료되었습니다." : "");
    };

    worker.onerror = () => handleWorkerError(requestId);

    worker.postMessage({
      type: "solve-grouped",
      requestId,
      input: buildGroupedSolverInputFromWindowForm(formState, calculation.items)
    });
  }

  // 진행 중인 계산을 취소하고 워커를 새로 시작할 수 있는 상태로 되돌린다.
  function handleCancelSolve(): void {
    resetSolverWorker();
    setIsSolving(false);
    setMessage("계산을 취소했습니다.");
  }

  // 현재 단일 절단 계산 결과를 클립보드에 복사한다.
  async function handleCopy(): Promise<void> {
    if (!plan) {
      return;
    }

    await navigator.clipboard.writeText(formatPlanForClipboard(plan));
    setMessage("계산 결과를 복사했습니다.");
  }

  // 현재 창문 계산 결과를 클립보드에 복사한다.
  async function handleGroupedCopy(): Promise<void> {
    if (!groupedResult) {
      return;
    }

    await navigator.clipboard.writeText(formatGroupedPlanForClipboard(groupedResult));
    setMessage("계산 결과를 복사했습니다.");
  }

  // 현재 직접 입력값을 공유 URL로 만들고 클립보드에 복사한다.
  async function handleShare(): Promise<void> {
    const query = encodeShareState(form);
    const url = `${window.location.origin}${window.location.pathname}?${query}`;

    window.history.replaceState(null, "", `?${query}`);
    await navigator.clipboard.writeText(url);
    setMessage("공유 링크를 복사했습니다.");
  }

  // 브라우저 인쇄 기능으로 작업 지시서를 출력한다.
  function handlePrint(): void {
    window.print();
  }

  return (
    <>
      <main className="screen-app min-h-screen bg-paper text-ink">
        <nav className="border-b border-hairline bg-canvas">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-paper text-sm font-bold text-brand">
                H
              </div>
              <p className="text-[15px] font-semibold text-ink">How2Cut</p>
            </div>
            <p className="hidden text-[15px] text-muted sm:block">알루미늄 절단 계획 도구</p>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="no-print grid gap-2 rounded-xl border border-hairline bg-canvas p-2 shadow-soft sm:w-fit sm:grid-cols-2">
            {[
              { value: "direct" as const, label: "직접 입력" },
              { value: "window" as const, label: "창문 정보" }
            ].map((mode) => {
              const isSelected = inputMode === mode.value;

              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => handleInputModeChange(mode.value)}
                  className={`min-h-10 rounded-md px-4 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-brand text-white shadow-soft"
                      : "bg-transparent text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
            <div className="space-y-3 border-l-4 border-brand pl-3 lg:sticky lg:top-5">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">입력 영역</p>
              {inputMode === "direct" ? (
                <CutInputForm
                  stockLength={form.stockLength}
                  kerf={form.kerf}
                  timeLimitMs={form.timeLimitMs}
                  optimizationMode={form.optimizationMode}
                  items={form.items}
                  errors={errors}
                  isSolving={isSolving}
                  onStockLengthChange={handleStockLengthChange}
                  onKerfChange={handleKerfChange}
                  onTimeLimitMsChange={handleTimeLimitMsChange}
                  onOptimizationModeChange={handleOptimizationModeChange}
                  onItemChange={handleItemChange}
                  onAddItem={handleAddItem}
                  onDuplicateItem={handleDuplicateItem}
                  onRemoveItem={handleRemoveItem}
                  onLoadExample={handleLoadExample}
                  onSolve={handleSolve}
                  onCancelSolve={handleCancelSolve}
                />
              ) : (
                <WindowInputForm
                  form={windowForm}
                  errors={errors}
                  isSolving={isSolving}
                  onFieldChange={handleWindowFieldChange}
                  onOptimizationModeChange={handleWindowOptimizationModeChange}
                  onSolve={handleWindowSolve}
                  onCancelSolve={handleCancelSolve}
                />
              )}
            </div>

            <div className="space-y-3 border-l-4 border-stickerOrange pl-3">
              <p className="text-xs font-bold uppercase tracking-wide text-stickerOrange">
                {inputMode === "window" && !groupedResult ? "확인 영역" : "결과 영역"}
              </p>

              {inputMode === "direct" ? (
              plan ? (
                <div className="space-y-6">
                  <CutPlanSummary
                    plan={plan}
                    message={message}
                    onCopy={handleCopy}
                    onPrint={handlePrint}
                    onShare={handleShare}
                  />
                  <WorkStepSummary plan={plan} />
                  <CutPlanVisualizer
                    plan={plan}
                    stockLength={parseNumericInput(form.stockLength) || 1}
                  />
                  <PatternSummary plan={plan} />
                </div>
              ) : (
                <section className="rounded-xl border border-dashed border-hairline bg-canvas p-8 text-center shadow-soft">
                  <p className="inline-flex rounded-full border border-hairline bg-paper px-3 py-1 text-xs font-semibold text-brand">
                    대기 중
                  </p>
                  <h2 className="mt-4 text-[26px] font-bold leading-tight text-ink">
                    절단 조건을 입력하고 계산하세요.
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-muted">
                    결과 영역에는 원자재 개수, 총 여유 길이, 작업 순서, 반복 패턴이 표시됩니다.
                  </p>
                </section>
              )
            ) : !groupedResult ? (
              <GeneratedCutList items={windowPreviewItems} onPrint={handlePrint} />
            ) : groupedResult ? (
              <GroupedCutPlanResults
                result={groupedResult}
                message={message}
                onCopy={handleGroupedCopy}
                onPrint={handlePrint}
              />
            ) : (
              <section className="rounded-xl border border-dashed border-hairline bg-canvas p-8 text-center shadow-soft">
                <p className="inline-flex rounded-full border border-hairline bg-paper px-3 py-1 text-xs font-semibold text-brand">
                  대기 중
                </p>
                <h2 className="mt-4 text-[26px] font-bold leading-tight text-ink">
                  창문 규격을 입력하고 계산하세요.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-muted">
                  결과 영역에는 프레임, 창틀, 방충망별 절단 계획이 표시됩니다.
                </p>
              </section>
            )}
          </div>
        </div>
        </div>
      </main>

      {plan && inputMode === "direct" ? (
        <PrintCutReport plan={plan} form={form} generatedAt={lastCalculatedAt} />
      ) : null}

      {groupedResult && inputMode === "window" ? (
        <PrintWindowCutReport
          result={groupedResult}
          form={windowForm}
          generatedItems={lastWindowGeneratedItems}
          generatedAt={lastCalculatedAt}
        />
      ) : null}

      {inputMode === "window" && !groupedResult ? (
        <PrintGeneratedCutListReport
          form={windowForm}
          generatedItems={windowPreviewItems}
          generatedAt={null}
        />
      ) : null}
    </>
  );
}
