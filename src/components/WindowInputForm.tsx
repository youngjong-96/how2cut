"use client";

import { useState } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  CircleStop,
  LoaderCircle,
  Settings2
} from "lucide-react";
import type { OptimizationMode } from "@/lib/solver/types";
import type { SlidingSize, WindowType } from "@/lib/windowRules";

export type WindowFormState = {
  windowType: WindowType;
  slidingSize: SlidingSize;
  width: string;
  height: string;
  quantity: string;
  hasScreen: boolean;
  frameStockLength: string;
  sashStockLength: string;
  screenStockLength: string;
  kerf: string;
  timeLimitMs: string;
  optimizationMode: OptimizationMode;
};

type WindowInputFormProps = {
  form: WindowFormState;
  errors: string[];
  isSolving: boolean;
  onFieldChange: <Key extends keyof WindowFormState>(
    field: Key,
    value: WindowFormState[Key]
  ) => void;
  onOptimizationModeChange: (value: OptimizationMode) => void;
  onSolve: () => void;
  onCancelSolve: () => void;
};

// 창문 규격과 절단 계획 옵션을 입력하는 폼을 렌더링한다.
export function WindowInputForm({
  form,
  errors,
  isSolving,
  onFieldChange,
  onOptimizationModeChange,
  onSolve,
  onCancelSolve
}: WindowInputFormProps) {
  const [showPlanningFields, setShowPlanningFields] = useState(false);
  const optimizationOptions: Array<{
    value: OptimizationMode;
    label: string;
    description: string;
  }> = [
    {
      value: "min-remainder",
      label: "잔재",
      description: "원자재와 잔여 길이 최소화"
    },
    {
      value: "min-stock-changes",
      label: "원자재",
      description: "같은 원자재 작업을 우선"
    },
    {
      value: "min-length-changes",
      label: "길이",
      description: "같은 길이 작업을 우선"
    },
    {
      value: "balanced",
      label: "균형",
      description: "잔재와 작업성을 함께 고려"
    }
  ];

  return (
    <section className="rounded-xl border-2 border-brand/25 bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-col gap-3">
        <div>
          <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
            창문 입력
          </p>
          <h2 className="mt-3 text-xl font-bold leading-tight text-ink">정양쪽문 규격</h2>
        </div>

        <div className="no-print grid gap-2 sm:grid-cols-[1fr_auto]">
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
          <span className="mb-1 block text-sm font-medium text-muted">문 종류</span>
          <input
            value="정양쪽문"
            readOnly
            className="min-h-11 w-full rounded border border-hairline bg-paper px-3 text-base text-ink outline-none"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">미서기 규격</span>
          <div className="grid grid-cols-2 gap-2">
            {[92, 115].map((size) => {
              const slidingSize = size as SlidingSize;
              const isSelected = form.slidingSize === slidingSize;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onFieldChange("slidingSize", slidingSize)}
                  className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition ${
                    isSelected
                      ? "border-brand bg-brand text-white shadow-soft"
                      : "border-hairline bg-paper text-ink hover:bg-white"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">가로(mm)</span>
            <input
              value={form.width}
              onChange={(event) => onFieldChange("width", event.target.value)}
              inputMode="decimal"
              className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
              placeholder="1800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">세로(mm)</span>
            <input
              value={form.height}
              onChange={(event) => onFieldChange("height", event.target.value)}
              inputMode="decimal"
              className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
              placeholder="1200"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">창문 수량</span>
            <input
              value={form.quantity}
              onChange={(event) => onFieldChange("quantity", event.target.value)}
              inputMode="numeric"
              className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
              placeholder="1"
            />
          </label>

          <label className="flex min-h-11 items-center gap-2 rounded border border-hairline bg-paper px-3 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.hasScreen}
              onChange={(event) => onFieldChange("hasScreen", event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            방충망 포함
          </label>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-hairline bg-paper p-3">
        <button
          type="button"
          onClick={() => setShowPlanningFields((currentValue) => !currentValue)}
          aria-expanded={showPlanningFields}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <Settings2 size={17} className="text-brand" aria-hidden="true" />
            절단 계획 필요 입력항목
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            {showPlanningFields ? "접기" : "펼치기"}
            {showPlanningFields ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </span>
        </button>

        {showPlanningFields ? (
          <div className="mt-4 border-t border-hairline pt-4">
            <div>
              <h3 className="mb-3 text-base font-bold text-ink">원자재 길이</h3>
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-muted">프레임 원자재(mm)</span>
                  <input
                    value={form.frameStockLength}
                    onChange={(event) => onFieldChange("frameStockLength", event.target.value)}
                    inputMode="decimal"
                    className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                    placeholder="6300"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-muted">창틀 원자재(mm)</span>
                  <input
                    value={form.sashStockLength}
                    onChange={(event) => onFieldChange("sashStockLength", event.target.value)}
                    inputMode="decimal"
                    className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                    placeholder="6300"
                  />
                </label>

                {form.hasScreen ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-muted">방충망 원자재(mm)</span>
                    <input
                      value={form.screenStockLength}
                      onChange={(event) => onFieldChange("screenStockLength", event.target.value)}
                      inputMode="decimal"
                      className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                      placeholder="6300"
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-muted">절단 손실(mm)</span>
                <input
                  value={form.kerf}
                  onChange={(event) => onFieldChange("kerf", event.target.value)}
                  inputMode="decimal"
                  className="min-h-11 w-full rounded border border-hairline bg-canvas px-3 text-base text-ink outline-none focus:border-brand focus:shadow-soft"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-muted">계산 제한(ms)</span>
                <input
                  value={form.timeLimitMs}
                  onChange={(event) => onFieldChange("timeLimitMs", event.target.value)}
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
                  const isSelected = form.optimizationMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onOptimizationModeChange(option.value)}
                      className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-brand bg-brand text-white shadow-soft"
                          : "border-hairline bg-canvas text-ink hover:bg-white"
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
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted">
            기본값: 원자재 6300mm, 절단 손실 0mm, 최소 잔재 우선
          </p>
        )}
      </div>

      {errors.length > 0 ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
