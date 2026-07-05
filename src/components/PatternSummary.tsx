import type { CutPlan } from "@/lib/solver/types";

type PatternSummaryProps = {
  plan: CutPlan;
};

// 숫자 값을 밀리미터 단위 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 같은 절단 패턴을 묶은 작업 지시 목록을 렌더링한다.
export function PatternSummary({ plan }: PatternSummaryProps) {
  return (
    <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-4">
        <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
          패턴
        </p>
        <h2 className="mt-3 text-xl font-bold leading-tight text-ink">반복 절단 패턴</h2>
      </div>

      <div className="space-y-3">
        {plan.patterns.map((pattern) => (
          <article
            key={pattern.id}
            className="grid gap-3 rounded-lg border border-hairline bg-paper p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center"
          >
            <div>
              <p className="text-sm text-muted">반복</p>
              <p className="text-xl font-bold text-ink">{pattern.count}회</p>
            </div>
            <p className="break-words text-base font-semibold text-ink">
              {pattern.cuts.map((cut) => formatMillimeter(cut)).join(" + ")}
            </p>
            <p className="text-sm text-muted">남음 {formatMillimeter(pattern.remainder)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
