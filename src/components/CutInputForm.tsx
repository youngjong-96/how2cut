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

export type FormCutItem = {
  id: string;
  length: string;
  quantity: string;
};

type CutInputFormProps = {
  stockLength: string;
  kerf: string;
  timeLimitMs: string;
  items: FormCutItem[];
  errors: string[];
  isSolving: boolean;
  onStockLengthChange: (value: string) => void;
  onKerfChange: (value: string) => void;
  onTimeLimitMsChange: (value: string) => void;
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
  items,
  errors,
  isSolving,
  onStockLengthChange,
  onKerfChange,
  onTimeLimitMsChange,
  onItemChange,
  onAddItem,
  onDuplicateItem,
  onRemoveItem,
  onLoadExample,
  onSolve,
  onCancelSolve
}: CutInputFormProps) {
  return (
    <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
            입력
          </p>
          <h2 className="mt-3 text-xl font-bold leading-tight text-ink">절단 조건</h2>
        </div>
        <button
          type="button"
          onClick={onLoadExample}
          className="no-print inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-paper"
        >
          <RefreshCw size={16} aria-hidden="true" />
          예시
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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

      <div className="no-print mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={onSolve}
          disabled={isSolving}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-base font-semibold text-white shadow-soft transition hover:bg-brandActive disabled:cursor-not-allowed disabled:bg-brand/60"
        >
          {isSolving ? (
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Calculator size={18} aria-hidden="true" />
          )}
          {isSolving ? "계산 중" : "최적 절단 계산"}
        </button>

        {isSolving ? (
          <button
            type="button"
            onClick={onCancelSolve}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-5 text-base font-semibold text-ink transition hover:bg-paper"
          >
            <CircleStop size={18} aria-hidden="true" />
            취소
          </button>
        ) : null}
      </div>
    </section>
  );
}
