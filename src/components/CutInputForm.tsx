"use client";

import {
  Calculator,
  CircleStop,
  CopyPlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";
import type { OptimizationMode } from "@/lib/solver/types";

export type FormCutItem = {
  id: string;
  length: string;
  quantity: string;
};

type CutInputFormProps = {
  stockLength: string;
  kerf: string;
  timeLimitMs: string;
  optimizationMode: OptimizationMode;
  items: FormCutItem[];
  errors: string[];
  isSolving: boolean;
  onStockLengthChange: (value: string) => void;
  onKerfChange: (value: string) => void;
  onTimeLimitMsChange: (value: string) => void;
  onOptimizationModeChange: (value: OptimizationMode) => void;
  onItemChange: (id: string, field: keyof Omit<FormCutItem, "id">, value: string) => void;
  onAddItem: () => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onLoadExample: () => void;
  onSolve: () => void;
  onCancelSolve: () => void;
};

// 절단 조건과 절단 항목을 입력하는 폼을 렌더링한다.
export function CutInputForm({
  stockLength,
  kerf,
  timeLimitMs,
  optimizationMode,
  items,
  errors,
  isSolving,
  onStockLengthChange,
  onKerfChange,
  onTimeLimitMsChange,
  onOptimizationModeChange,
  onItemChange,
  onAddItem,
  onDuplicateItem,
  onRemoveItem,
  onLoadExample,
  onSolve,
  onCancelSolve
}: CutInputFormProps) {
  const optimizationOptions: Array<{
    value: OptimizationMode;
    label: string;
    description: string;
  }> = [
    {
      value: "balanced",
      label: "균형",
      description: "잔재와 작업성을 함께 고려"
    },
    {
      value: "min-remainder",
      label: "잔재",
      description: "원자재와 잔여 길이 최소화"
    },
    {
      value: "min-length-changes",
      label: "길이",
      description: "같은 길이를 연속 절단"
    },
    {
      value: "min-stock-changes",
      label: "원자재",
      description: "한 원자재를 먼저 마무리"
    }
  ];

  return (
    <section className="rounded-xl border-2 border-brand/25 bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-col gap-3">
        <div>
          <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
            입력
          </p>
          <h2 className="mt-3 text-xl font-bold leading-tight text-ink">절단 조건</h2>
        </div>
        <div className="no-print grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <button
            type="button"
            onClick={onLoadExample}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-paper"
          >
            <RefreshCw size={16} aria-hidden="true" />
            예시
          </button>
          <button
            type="button"
            onClick={onSolve}
            disabled={isSolving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-brandActive disabled:cursor-not-allowed disabled:bg-brand/60"
          >
            {isSolving ? (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <Calculator size={17} aria-hidden="true" />
            )}
            {isSolving ? "계산 중" : "계산"}
          </button>

          {isSolving ? (
            <button
              type="button"
              onClick={onCancelSolve}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-sm font-semibold text-ink transition hover:bg-paper"
            >
              <CircleStop size={17} aria-hidden="true" />
              취소
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">원자재 길이(mm)</span>
          <input
            value={stockLength}
            onChange={(event) => onStockLengthChange(event.target.value)}
            inputMode="decimal"
            className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
            placeholder="6000"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">절단 손실(mm)</span>
          <input
            value={kerf}
            onChange={(event) => onKerfChange(event.target.value)}
            inputMode="decimal"
            className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
            placeholder="0"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">계산 제한(ms)</span>
          <input
            value={timeLimitMs}
            onChange={(event) => onTimeLimitMsChange(event.target.value)}
            inputMode="numeric"
            className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
            placeholder="1200"
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-sm font-medium text-muted">최적화 우선순위</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {optimizationOptions.map((option) => {
            const isSelected = optimizationMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onOptimizationModeChange(option.value)}
                className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand text-white shadow-soft"
                    : "border-hairline bg-paper text-ink hover:bg-white"
                }`}
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className={`mt-0.5 block text-xs ${isSelected ? "text-white/80" : "text-muted"}`}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-ink">절단 항목</h3>
          <button
            type="button"
            onClick={onAddItem}
            className="no-print inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-paper"
          >
            <Plus size={16} aria-hidden="true" />
            추가
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-lg border border-hairline bg-paper p-3 sm:grid-cols-[1fr_96px_88px] sm:items-end"
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-muted">
                  길이(mm) #{index + 1}
                </span>
                <input
                  value={item.length}
                  onChange={(event) => onItemChange(item.id, "length", event.target.value)}
                  inputMode="decimal"
                  className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                  placeholder="1200"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-muted">수량</span>
                <input
                  value={item.quantity}
                  onChange={(event) => onItemChange(item.id, "quantity", event.target.value)}
                  inputMode="numeric"
                  className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                  placeholder="1"
                />
              </label>

              <div className="no-print grid grid-cols-2 gap-2 sm:grid-cols-1">
                <button
                  type="button"
                  onClick={() => onDuplicateItem(item.id)}
                  aria-label={`${index + 1}번 절단 항목 복제`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-hairline bg-canvas text-muted transition hover:bg-white hover:text-ink"
                >
                  <CopyPlus size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`${index + 1}번 절단 항목 삭제`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-hairline bg-canvas text-muted transition hover:bg-white hover:text-red-600"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

    </section>
  );
}
