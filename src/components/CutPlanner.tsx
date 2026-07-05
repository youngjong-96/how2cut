"use client";

import { useEffect, useRef, useState } from "react";
import { CutInputForm, type FormCutItem } from "./CutInputForm";
import { CutPlanSummary } from "./CutPlanSummary";
import { CutPlanVisualizer } from "./CutPlanVisualizer";
import { PatternSummary } from "./PatternSummary";
import { PrintCutReport } from "./PrintCutReport";
import type { CutPlan, SolverInput, SolverResult } from "@/lib/solver/types";

type PlannerFormState = {
  stockLength: string;
  kerf: string;
  timeLimitMs: string;
  items: FormCutItem[];
};

type SolverWorkerResponse =
  | {
      type: "result";
      requestId: string;
      result: SolverResult;
    }
  | {
      type: "error";
      requestId: string;
      error: string;
    };

const storageKey = "how2cut-form-v1";

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

// 브라우저 이벤트에서 새 절단 항목을 구분할 고유 ID를 만든다.
function createId(): string {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 빈 절단 항목 행을 생성한다.
function createEmptyItem(): FormCutItem {
  return {
    id: createId(),
    length: "",
    quantity: "1"
  };
}

// 처음 진입했을 때 보여줄 예시 입력값을 만든다.
function createExampleState(): PlannerFormState {
  return {
    stockLength: "6000",
    kerf: "0",
    timeLimitMs: "1200",
    items: [
      { id: "example-1", length: "2400", quantity: "2" },
      { id: "example-2", length: "1800", quantity: "3" },
      { id: "example-3", length: "1200", quantity: "2" },
      { id: "example-4", length: "900", quantity: "4" }
    ]
  };
}

// 문자열 입력값을 계산에 사용할 숫자로 변환한다.
function parseNumericInput(value: string): number {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return Number.NaN;
  }

  return Number(normalizedValue);
}

// 폼 상태를 계산 엔진이 이해하는 입력 객체로 변환한다.
function buildSolverInputFromForm(form: PlannerFormState): SolverInput {
  return {
    stockLength: parseNumericInput(form.stockLength),
    kerf: parseNumericInput(form.kerf || "0"),
    timeLimitMs: Math.round(parseNumericInput(form.timeLimitMs || "1200")),
    items: form.items.map((item) => ({
      id: item.id,
      length: parseNumericInput(item.length),
      quantity: Math.round(parseNumericInput(item.quantity))
    }))
  };
}

// 현재 폼 상태를 짧은 공유용 쿼리 문자열로 변환한다.
function encodeShareState(form: PlannerFormState): string {
  const params = new URLSearchParams();
  const items = form.items
    .filter((item) => item.length.trim() && item.quantity.trim())
    .map((item) => `${item.length.trim()}x${item.quantity.trim()}`)
    .join(",");

  params.set("stock", form.stockLength);
  params.set("kerf", form.kerf);
  params.set("time", form.timeLimitMs);
  params.set("items", items);

  return params.toString();
}

// 공유 URL의 쿼리 문자열을 폼 상태로 복원한다.
function decodeShareState(search: string): PlannerFormState | null {
  const params = new URLSearchParams(search);
  const stockLength = params.get("stock");
  const itemsParam = params.get("items");

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
    items
  };
}

// 절단 계획을 클립보드에 복사하기 좋은 텍스트로 변환한다.
function formatPlanForClipboard(plan: CutPlan): string {
  const barLines = plan.bars.map((bar, index) => {
    const cuts = bar.cuts.map((cut) => `${cut.length}mm`).join(" + ");
    return `원자재 ${index + 1}: ${cuts} / 남음 ${Math.round(bar.remainder)}mm`;
  });

  return [
    `필요 원자재: ${plan.bars.length}개`,
    `총 잔여 길이: ${Math.round(plan.totalRemainder)}mm`,
    `사용률: ${Math.round(plan.utilizationRate * 1000) / 10}%`,
    "",
    ...barLines
  ].join("\n");
}

// 절단 계획 앱의 입력, 계산, 결과 표시 흐름을 관리한다.
export function CutPlanner() {
  const [form, setForm] = useState<PlannerFormState>(createExampleState);
  const [plan, setPlan] = useState<CutPlan | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  // 저장된 입력값 또는 공유 URL을 초기 입력값으로 불러온다.
  useEffect(() => {
    const sharedState = decodeShareState(window.location.search);

    if (sharedState) {
      setForm(sharedState);
      return;
    }

    const savedState = window.localStorage.getItem(storageKey);

    if (savedState) {
      setForm(JSON.parse(savedState) as PlannerFormState);
    }
  }, []);

  // 입력값이 바뀔 때마다 다음 방문을 위해 브라우저에 저장한다.
  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
  }, [form]);

  // 컴포넌트가 사라질 때 실행 중인 계산 워커를 정리한다.
  useEffect(() => {
    // 언마운트 시 워커 프로세스를 종료한다.
    function cleanupSolverWorker(): void {
      resetSolverWorker();
    }

    return cleanupSolverWorker;
  }, []);

  // 현재 워커를 종료하고 참조를 초기화한다.
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

  // 원자재 길이 입력값을 갱신한다.
  function handleStockLengthChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, stockLength: value }));
    setMessage("");
  }

  // 절단 손실 입력값을 갱신한다.
  function handleKerfChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, kerf: value }));
    setMessage("");
  }

  // 정확 탐색 시간 제한 입력값을 갱신한다.
  function handleTimeLimitMsChange(value: string): void {
    setForm((currentForm) => ({ ...currentForm, timeLimitMs: value }));
    setMessage("");
  }

  // 특정 절단 항목 행의 길이 또는 수량을 갱신한다.
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

  // 새 절단 항목 행을 추가한다.
  function handleAddItem(): void {
    setForm((currentForm) => ({
      ...currentForm,
      items: [...currentForm.items, createEmptyItem()]
    }));
    setMessage("");
  }

  // 선택한 절단 항목 행을 복제한다.
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

  // 선택한 절단 항목 행을 삭제한다.
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

  // 예시 데이터를 폼에 다시 채운다.
  function handleLoadExample(): void {
    setForm(createExampleState());
    setPlan(null);
    setErrors([]);
    setLastCalculatedAt(null);
    setMessage("예시 데이터를 불러왔습니다.");
  }

  // 현재 입력값으로 절단 계획을 계산한다.
  function handleSolve(): void {
    const worker = getSolverWorker();
    const requestId = createSolverRequestId();

    activeRequestIdRef.current = requestId;
    setIsSolving(true);
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

      setPlan(response.result.plan);
      setErrors(response.result.errors);
      setLastCalculatedAt(response.result.plan ? new Date() : null);
      setMessage(response.result.plan ? "계산이 완료되었습니다." : "");
    };

    worker.onerror = () => {
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setIsSolving(false);
      activeRequestIdRef.current = null;
      setPlan(null);
      setErrors(["계산 워커에서 오류가 발생했습니다. 다시 시도해주세요."]);
      setMessage("");
      resetSolverWorker();
    };

    worker.postMessage({
      type: "solve",
      requestId,
      input: buildSolverInputFromForm(form)
    });
  }

  // 진행 중인 계산을 취소하고 워커를 새로 시작할 수 있는 상태로 되돌린다.
  function handleCancelSolve(): void {
    resetSolverWorker();
    setIsSolving(false);
    setMessage("계산을 취소했습니다.");
  }

  // 계산 결과를 클립보드에 복사한다.
  async function handleCopy(): Promise<void> {
    if (!plan) {
      return;
    }

    await navigator.clipboard.writeText(formatPlanForClipboard(plan));
    setMessage("계산 결과를 복사했습니다.");
  }

  // 현재 입력값을 공유 URL로 만들고 클립보드에 복사한다.
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

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <header className="grid gap-5 border-b border-hairline pb-7 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-semibold text-brand">
                Cutting planner
              </p>
              <h1 className="mt-4 max-w-3xl text-[40px] font-bold leading-[1.1] text-ink sm:text-[54px]">
                알루미늄 절단 계산기
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                원자재 길이와 필요한 절단 길이를 입력하면 필요한 원자재 개수와 절단 순서를
                한 화면에서 정리합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-hairline bg-canvas p-3 text-center shadow-soft">
              <div>
                <p className="text-xs font-semibold text-faint">입력</p>
                <p className="mt-1 text-sm font-bold text-ink">길이/수량</p>
              </div>
              <div className="border-x border-hairline">
                <p className="text-xs font-semibold text-faint">계산</p>
                <p className="mt-1 text-sm font-bold text-ink">최적 배치</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-faint">출력</p>
                <p className="mt-1 text-sm font-bold text-ink">작업 지시서</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
            <div className="lg:sticky lg:top-6">
              <CutInputForm
                stockLength={form.stockLength}
                kerf={form.kerf}
                timeLimitMs={form.timeLimitMs}
                items={form.items}
                errors={errors}
                isSolving={isSolving}
                onStockLengthChange={handleStockLengthChange}
                onKerfChange={handleKerfChange}
                onTimeLimitMsChange={handleTimeLimitMsChange}
                onItemChange={handleItemChange}
                onAddItem={handleAddItem}
                onDuplicateItem={handleDuplicateItem}
                onRemoveItem={handleRemoveItem}
                onLoadExample={handleLoadExample}
                onSolve={handleSolve}
                onCancelSolve={handleCancelSolve}
              />
            </div>

            {plan ? (
              <div className="space-y-6">
                <CutPlanSummary
                  plan={plan}
                  message={message}
                  onCopy={handleCopy}
                  onPrint={handlePrint}
                  onShare={handleShare}
                />
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
                  절단 조건을 입력하고 계산하세요
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-muted">
                  결과 영역에는 필요한 원자재 개수, 총 잔여 길이, 원자재별 절단 막대,
                  반복 패턴이 표시됩니다.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>

      {plan ? <PrintCutReport plan={plan} form={form} generatedAt={lastCalculatedAt} /> : null}
    </>
  );
}
