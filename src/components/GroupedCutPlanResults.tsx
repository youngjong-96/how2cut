import { Copy, PackageCheck, Printer, Ruler, Sigma } from "lucide-react";
import type { GroupedSolverResult } from "@/lib/groupedSolver";
import { CutPlanVisualizer } from "./CutPlanVisualizer";
import { PatternSummary } from "./PatternSummary";
import { WorkStepSummary } from "./WorkStepSummary";

type GroupedCutPlanResultsProps = {
  result: GroupedSolverResult;
  message: string;
  onCopy: () => void;
  onPrint: () => void;
};

// 숫자 길이를 쉼표가 포함된 밀리미터 문자열로 바꾼다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 사용률을 백분율 문자열로 바꾼다.
function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

// 부품군별 결과를 합산해 전체 요약 수치를 만든다.
function getResultTotals(result: GroupedSolverResult): {
  barCount: number;
  totalRequiredLength: number;
  totalConsumedLength: number;
  totalRemainder: number;
  totalStockLength: number;
  utilizationRate: number;
} {
  const barCount = result.plans.reduce((sum, groupPlan) => sum + groupPlan.plan.bars.length, 0);
  const totalRequiredLength = result.plans.reduce(
    (sum, groupPlan) => sum + groupPlan.plan.totalRequiredLength,
    0
  );
  const totalConsumedLength = result.plans.reduce(
    (sum, groupPlan) => sum + groupPlan.plan.totalConsumedLength,
    0
  );
  const totalRemainder = result.plans.reduce(
    (sum, groupPlan) => sum + groupPlan.plan.totalRemainder,
    0
  );
  const totalStockLength = result.plans.reduce(
    (sum, groupPlan) => sum + groupPlan.plan.totalStockLength,
    0
  );

  return {
    barCount,
    totalRequiredLength,
    totalConsumedLength,
    totalRemainder,
    totalStockLength,
    utilizationRate: totalStockLength > 0 ? totalConsumedLength / totalStockLength : 0
  };
}

// 창문 모드의 부품군별 최적 절단 결과를 렌더링한다.
export function GroupedCutPlanResults({
  result,
  message,
  onCopy,
  onPrint
}: GroupedCutPlanResultsProps) {
  const totals = getResultTotals(result);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border-2 border-stickerOrange/35 bg-canvas p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
              결과
            </p>
            <h2 className="mt-3 text-xl font-bold leading-tight text-ink">창문 절단 계획 요약</h2>
          </div>
          <div className="no-print grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCopy}
              aria-label="결과 복사"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-muted transition hover:bg-paper hover:text-ink"
            >
              <Copy size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onPrint}
              aria-label="인쇄"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-muted transition hover:bg-paper hover:text-ink"
            >
              <Printer size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-hairline bg-paper p-4">
            <p className="text-sm text-muted">필요 원자재</p>
            <p className="mt-1 text-2xl font-bold text-ink">{totals.barCount}개</p>
          </div>
          <div className="rounded-lg border border-hairline bg-paper p-4">
            <p className="text-sm text-muted">총 여유 길이</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatMillimeter(totals.totalRemainder)}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-paper p-4">
            <p className="text-sm text-muted">사용률</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatPercent(totals.utilizationRate)}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-paper p-4">
            <p className="text-sm text-muted">부품군</p>
            <p className="mt-1 text-2xl font-bold text-ink">{result.plans.length}개</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Sigma size={16} aria-hidden="true" />
            총 필요 길이 {formatMillimeter(totals.totalRequiredLength)}
          </p>
          <p className="flex items-center gap-2">
            <PackageCheck size={16} aria-hidden="true" />
            총 원자재 길이 {formatMillimeter(totals.totalStockLength)}
          </p>
        </div>

        {result.warnings.length > 0 ? (
          <div className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-inkSecondary">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {result.errors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {result.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {message ? <p className="no-print mt-3 text-sm font-medium text-brand">{message}</p> : null}
      </section>

      {result.plans.map((groupPlan) => (
        <section key={groupPlan.group} className="space-y-4">
          <div className="rounded-xl border-2 border-stickerOrange/25 bg-canvas p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
                  {groupPlan.groupLabel}
                </p>
                <h2 className="mt-3 text-xl font-bold leading-tight text-ink">
                  {groupPlan.groupLabel} 절단 계획
                </h2>
              </div>
              <p className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Ruler size={16} aria-hidden="true" />
                원자재 {formatMillimeter(groupPlan.stockLength)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-hairline bg-paper p-4">
                <p className="text-sm text-muted">필요 원자재</p>
                <p className="mt-1 text-xl font-bold text-ink">{groupPlan.plan.bars.length}개</p>
              </div>
              <div className="rounded-lg border border-hairline bg-paper p-4">
                <p className="text-sm text-muted">여유 길이</p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {formatMillimeter(groupPlan.plan.totalRemainder)}
                </p>
              </div>
              <div className="rounded-lg border border-hairline bg-paper p-4">
                <p className="text-sm text-muted">사용률</p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {formatPercent(groupPlan.plan.utilizationRate)}
                </p>
              </div>
            </div>
          </div>

          <WorkStepSummary plan={groupPlan.plan} />
          <CutPlanVisualizer plan={groupPlan.plan} stockLength={groupPlan.stockLength} />
          <PatternSummary plan={groupPlan.plan} />
        </section>
      ))}
    </div>
  );
}
