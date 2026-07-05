import type { CutPlan } from "@/lib/solver/types";

type WorkStepSummaryProps = {
  plan: CutPlan;
};

// 숫자 값을 밀리미터 단위 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 작업 단계 안의 절단 지시를 사람이 읽기 좋은 문자열로 만든다.
function formatStepCuts(cuts: CutPlan["workSteps"][number]["cuts"]): string {
  return cuts
    .map((cut) => {
      if (cuts.every((item) => item.length === cut.length)) {
        return `원자재 ${cut.barNumber}번 ${cut.quantity}개`;
      }

      return `${formatMillimeter(cut.length)} ${cut.quantity}개`;
    })
    .join(", ");
}

// 실제 작업자가 따라갈 절단 순서를 렌더링한다.
export function WorkStepSummary({ plan }: WorkStepSummaryProps) {
  return (
    <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-4">
        <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
          작업 순서
        </p>
        <h2 className="mt-3 text-xl font-bold leading-tight text-ink">현장 절단 순서</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          선택한 우선순위에 맞춰 작업자가 실제로 따라가기 쉬운 순서로 정리했습니다.
        </p>
      </div>

      <div className="space-y-3">
        {plan.workSteps.map((step) => (
          <article
            key={step.id}
            className="grid gap-3 rounded-lg border border-hairline bg-paper p-4 sm:grid-cols-[72px_1fr] sm:items-start"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {step.order}
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.subtitle}</p>
              <p className="mt-2 break-words text-sm font-semibold text-ink">
                {formatStepCuts(step.cuts)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
