import { CheckCircle2, Clock, Copy, Printer, Share2, Sigma } from "lucide-react";
import type { CutPlan } from "@/lib/solver/types";

type CutPlanSummaryProps = {
  plan: CutPlan;
  message: string;
  onCopy: () => void;
  onPrint: () => void;
  onShare: () => void;
};

// 밀리미터 값을 천 단위 구분이 있는 문자열로 표시한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 비율 값을 백분율 문자열로 표시한다.
function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

// 절단 결과의 핵심 수치를 요약해서 렌더링한다.
export function CutPlanSummary({ plan, message, onCopy, onPrint, onShare }: CutPlanSummaryProps) {
  const statusText = plan.isOptimal ? "최적해 확인" : "근사 결과";
  const methodText = plan.method === "exact" ? "정확 탐색" : "빠른 계산";

  return (
    <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
            결과
          </p>
          <h2 className="mt-3 text-xl font-bold leading-tight text-ink">절단 계획 요약</h2>
        </div>
        <div className="no-print grid grid-cols-3 gap-2">
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
            onClick={onShare}
            aria-label="공유 링크 복사"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-muted transition hover:bg-paper hover:text-ink"
          >
            <Share2 size={17} aria-hidden="true" />
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
          <p className="mt-1 text-2xl font-bold text-ink">{plan.bars.length}개</p>
        </div>
        <div className="rounded-lg border border-hairline bg-paper p-4">
          <p className="text-sm text-muted">총 잔여 길이</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatMillimeter(plan.totalRemainder)}</p>
        </div>
        <div className="rounded-lg border border-hairline bg-paper p-4">
          <p className="text-sm text-muted">사용률</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatPercent(plan.utilizationRate)}</p>
        </div>
        <div className="rounded-lg border border-hairline bg-paper p-4">
          <p className="text-sm text-muted">계산 상태</p>
          <p className="mt-1 flex items-center gap-2 text-base font-bold text-ink">
            <CheckCircle2 size={17} className="text-brand" aria-hidden="true" />
            {statusText}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <Sigma size={16} aria-hidden="true" />
          총 필요 길이 {formatMillimeter(plan.totalRequiredLength)}
        </p>
        <p className="flex items-center gap-2">
          <Clock size={16} aria-hidden="true" />
          {methodText} · {plan.elapsedMs}ms
        </p>
      </div>

      {plan.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-inkSecondary">
          {plan.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {message ? <p className="no-print mt-3 text-sm font-medium text-brand">{message}</p> : null}
    </section>
  );
}
