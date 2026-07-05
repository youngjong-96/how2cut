import type { CutPlan } from "@/lib/solver/types";

type CutPlanVisualizerProps = {
  plan: CutPlan;
  stockLength: number;
};

const segmentColors = [
  "bg-[#d6b6f6] text-[#391c57]",
  "bg-[#d9f0ef] text-[#195f5c]",
  "bg-[#ffe1cc] text-[#793400]",
  "bg-[#dbeefe] text-[#184f7e]",
  "bg-[#daf4df] text-[#0f6120]",
  "bg-[#ffd6ee] text-[#7a1954]"
];

// 숫자 값을 밀리미터 단위 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 원자재 길이 대비 절단 구간의 너비 비율을 계산한다.
function getSegmentWidth(length: number, stockLength: number): string {
  const width = stockLength <= 0 ? 0 : (length / stockLength) * 100;
  return `${Math.max(0, Math.min(width, 100))}%`;
}

// 원자재별 절단 배치를 막대 그래프로 렌더링한다.
export function CutPlanVisualizer({ plan, stockLength }: CutPlanVisualizerProps) {
  return (
    <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-soft sm:p-6">
      <div className="mb-4">
        <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
          배치
        </p>
        <h2 className="mt-3 text-xl font-bold leading-tight text-ink">원자재별 절단 방법</h2>
      </div>

      <div className="space-y-4">
        {plan.bars.map((bar, barIndex) => (
          <article key={bar.id} className="rounded-lg border border-hairline bg-paper p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-bold text-ink">원자재 {barIndex + 1}</h3>
              <p className="text-sm text-muted">남음 {formatMillimeter(bar.remainder)}</p>
            </div>

            <div className="flex min-h-14 w-full overflow-hidden rounded-lg border border-hairline bg-canvas">
              {bar.cuts.map((cut, cutIndex) => (
                <div
                  key={cut.id}
                  className={`flex min-w-0 items-center justify-center border-r border-white/70 px-1 text-xs font-semibold sm:text-sm ${
                    segmentColors[cutIndex % segmentColors.length]
                  }`}
                  style={{ width: getSegmentWidth(cut.usedLength, stockLength) }}
                  title={`${formatMillimeter(cut.length)} 절단`}
                >
                  <span className="truncate">{formatMillimeter(cut.length)}</span>
                </div>
              ))}

              {bar.remainder > 0 ? (
                <div
                  className="flex min-w-0 items-center justify-center bg-canvas px-1 text-xs font-medium text-muted sm:text-sm"
                  style={{ width: getSegmentWidth(bar.remainder, stockLength) }}
                  title={`${formatMillimeter(bar.remainder)} 남음`}
                >
                  <span className="truncate">{formatMillimeter(bar.remainder)}</span>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-muted">
              절단: {bar.cuts.map((cut) => formatMillimeter(cut.length)).join(" + ")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
