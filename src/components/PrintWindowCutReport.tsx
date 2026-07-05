import type { GroupedSolverResult } from "@/lib/groupedSolver";
import type { CutPlan, OptimizationMode } from "@/lib/solver/types";
import type { GeneratedCutItem } from "@/lib/windowRules";
import type { WindowFormState } from "./WindowInputForm";

type PrintWindowCutReportProps = {
  result: GroupedSolverResult;
  form: WindowFormState;
  generatedItems: GeneratedCutItem[];
  generatedAt: Date | null;
};

// 숫자 길이를 보고서용 밀리미터 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 비율 값을 보고서용 백분율 문자열로 변환한다.
function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

// 출력 기준 시각을 한국어 날짜와 시간 문자열로 변환한다.
function formatDateTime(date: Date | null): string {
  const targetDate = date ?? new Date();

  return targetDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// 절단 길이 배열을 보고서 표에 넣기 좋은 한 줄 문자열로 만든다.
function formatCutList(cuts: number[]): string {
  return cuts.map((cut) => formatMillimeter(cut)).join(" + ");
}

// 최적화 모드 코드를 작업자가 읽는 한글 라벨로 바꾼다.
function getOptimizationModeLabel(mode: OptimizationMode): string {
  const labels: Record<OptimizationMode, string> = {
    balanced: "균형 우선",
    "min-remainder": "최소 잔재 우선",
    "min-length-changes": "최소 길이 변경 우선",
    "min-stock-changes": "최소 원자재 변경 우선"
  };

  return labels[mode];
}

// 부품군별 결과를 합산해 보고서 상단 요약값을 만든다.
function getReportTotals(result: GroupedSolverResult): {
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

// 작업 순서 안의 절단 지시를 보고서용 짧은 문자열로 만든다.
function formatWorkStepCuts(step: CutPlan["workSteps"][number]): string {
  return step.cuts
    .map((cut) => {
      if (step.groupType === "length") {
        return `원자재 ${cut.barNumber}번 ${cut.quantity}개`;
      }

      return `${formatMillimeter(cut.length)} ${cut.quantity}개`;
    })
    .join(", ");
}

// 창문 정보 기반 절단 계획을 현장 작업 지시서 형태로 출력한다.
export function PrintWindowCutReport({
  result,
  form,
  generatedItems,
  generatedAt
}: PrintWindowCutReportProps) {
  const totals = getReportTotals(result);

  return (
    <section className="print-report" aria-label="창문 절단 작업 지시서">
      <header className="report-header">
        <div>
          <p className="report-kicker">How2Cut</p>
          <h1>창문 절단 작업 지시서</h1>
        </div>
        <div className="report-meta">
          <p>출력일: {formatDateTime(generatedAt)}</p>
          <p>상태: {getOptimizationModeLabel(form.optimizationMode)}</p>
        </div>
      </header>

      <section className="report-section">
        <h2>1. 창문 정보</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>문 종류</th>
              <td>정양쪽문</td>
              <th>미서기 규격</th>
              <td>{form.slidingSize}</td>
            </tr>
            <tr>
              <th>가로</th>
              <td>{form.width}mm</td>
              <th>세로</th>
              <td>{form.height}mm</td>
            </tr>
            <tr>
              <th>창문 수량</th>
              <td>{form.quantity}개</td>
              <th>방충망</th>
              <td>{form.hasScreen ? "포함" : "없음"}</td>
            </tr>
            <tr>
              <th>절단 손실</th>
              <td>{form.kerf || "0"}mm</td>
              <th>최적화 기준</th>
              <td>{getOptimizationModeLabel(form.optimizationMode)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>2. 전체 요약</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>필요 원자재</th>
              <td>{totals.barCount}개</td>
              <th>부품군</th>
              <td>{result.plans.length}개</td>
            </tr>
            <tr>
              <th>총 필요 길이</th>
              <td>{formatMillimeter(totals.totalRequiredLength)}</td>
              <th>총 원자재 길이</th>
              <td>{formatMillimeter(totals.totalStockLength)}</td>
            </tr>
            <tr>
              <th>총 여유 길이</th>
              <td>{formatMillimeter(totals.totalRemainder)}</td>
              <th>사용률</th>
              <td>{formatPercent(totals.utilizationRate)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>3. 부품군별 요약</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>부품군</th>
              <th>원자재 길이</th>
              <th>필요 원자재</th>
              <th>여유 길이</th>
              <th>사용률</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.map((groupPlan) => (
              <tr key={groupPlan.group}>
                <td>{groupPlan.groupLabel}</td>
                <td>{formatMillimeter(groupPlan.stockLength)}</td>
                <td>{groupPlan.plan.bars.length}개</td>
                <td>{formatMillimeter(groupPlan.plan.totalRemainder)}</td>
                <td>{formatPercent(groupPlan.plan.utilizationRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>4. 산출 절단 목록</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>부품군</th>
              <th>길이</th>
              <th>수량</th>
              <th>부품명</th>
              <th>확인</th>
            </tr>
          </thead>
          <tbody>
            {generatedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.groupLabel}</td>
                <td>{formatMillimeter(item.length)}</td>
                <td>{item.quantity}개</td>
                <td>{item.sourceLabels.join(" / ")}</td>
                <td className="check-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>5. 현장 작업 순서</h2>
        <table className="report-table report-cut-table">
          <thead>
            <tr>
              <th>부품군</th>
              <th>순서</th>
              <th>작업 블록</th>
              <th>절단 지시</th>
              <th>확인</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.flatMap((groupPlan) =>
              groupPlan.plan.workSteps.map((step) => (
                <tr key={`${groupPlan.group}-${step.id}`}>
                  <td>{groupPlan.groupLabel}</td>
                  <td>{step.order}</td>
                  <td>
                    {step.title}
                    <br />
                    <span className="report-muted">{step.subtitle}</span>
                  </td>
                  <td>{formatWorkStepCuts(step)}</td>
                  <td className="check-cell" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>6. 반복 절단 패턴</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>부품군</th>
              <th>반복</th>
              <th>절단 구성</th>
              <th>남는 길이</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.flatMap((groupPlan) =>
              groupPlan.plan.patterns.map((pattern) => (
                <tr key={`${groupPlan.group}-${pattern.id}`}>
                  <td>{groupPlan.groupLabel}</td>
                  <td>{pattern.count}회</td>
                  <td>{formatCutList(pattern.cuts)}</td>
                  <td>{formatMillimeter(pattern.remainder)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>7. 원자재별 절단 지시</h2>
        <table className="report-table report-cut-table">
          <thead>
            <tr>
              <th>부품군</th>
              <th>원자재</th>
              <th>절단 순서</th>
              <th>남는 길이</th>
              <th>확인</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.flatMap((groupPlan) =>
              groupPlan.plan.bars.map((bar, index) => (
                <tr key={`${groupPlan.group}-${bar.id}`}>
                  <td>{groupPlan.groupLabel}</td>
                  <td>{index + 1}</td>
                  <td>{formatCutList(bar.cuts.map((cut) => cut.length))}</td>
                  <td>{formatMillimeter(bar.remainder)}</td>
                  <td className="check-cell" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
