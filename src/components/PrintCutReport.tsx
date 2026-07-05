import type { CutPlan, OptimizationMode } from "@/lib/solver/types";

type PrintableFormItem = {
  id: string;
  length: string;
  quantity: string;
};

type PrintableFormState = {
  stockLength: string;
  kerf: string;
  timeLimitMs: string;
  items: PrintableFormItem[];
};

type PrintCutReportProps = {
  plan: CutPlan;
  form: PrintableFormState;
  generatedAt: Date | null;
};

// 숫자 값을 밀리미터 단위 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 비율 값을 백분율 문자열로 변환한다.
function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

// 출력 시각을 한국어 날짜/시간 문자열로 변환한다.
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

// 절단 길이 목록을 작업자가 읽기 좋은 문자열로 만든다.
function formatCutList(cuts: number[]): string {
  return cuts.map((cut) => formatMillimeter(cut)).join(" + ");
}

// 폼 입력값 중 실제 절단 항목으로 볼 수 있는 행만 추린다.
function getPrintableItems(form: PrintableFormState): PrintableFormItem[] {
  return form.items.filter((item) => item.length.trim() && item.quantity.trim());
}

// 최적화 모드 값을 보고서에 표시할 한국어 라벨로 변환한다.
function getOptimizationModeLabel(mode: OptimizationMode): string {
  const labels: Record<OptimizationMode, string> = {
    balanced: "균형 우선",
    "min-remainder": "최소 잔재 우선",
    "min-length-changes": "최소 길이 변경 우선",
    "min-stock-changes": "최소 원자재 변경 우선"
  };

  return labels[mode];
}

// 계산 방식과 최적 여부를 작업 지시서용 상태 문구로 변환한다.
function getReportStatus(plan: CutPlan): string {
  if (plan.isOptimal) {
    return plan.method === "exact" ? "최적해 확인" : "최적 결과";
  }

  return getOptimizationModeLabel(plan.optimizationMode);
}

// 작업 단계 안의 절단 지시를 보고서용 문자열로 변환한다.
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

// 작업자가 들고 바로 확인할 수 있는 인쇄 전용 절단 보고서를 렌더링한다.
export function PrintCutReport({ plan, form, generatedAt }: PrintCutReportProps) {
  const printableItems = getPrintableItems(form);

  return (
    <section className="print-report" aria-label="알루미늄 절단 작업 지시서">
      <header className="report-header">
        <div>
          <p className="report-kicker">How2Cut</p>
          <h1>알루미늄 절단 작업 지시서</h1>
        </div>
        <div className="report-meta">
          <p>출력일: {formatDateTime(generatedAt)}</p>
          <p>상태: {getReportStatus(plan)}</p>
        </div>
      </header>

      <section className="report-section">
        <h2>1. 작업 요약</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>원자재 길이</th>
              <td>{form.stockLength}mm</td>
              <th>필요 원자재</th>
              <td>{plan.bars.length}개</td>
            </tr>
            <tr>
              <th>총 필요 길이</th>
              <td>{formatMillimeter(plan.totalRequiredLength)}</td>
              <th>총 잔여 길이</th>
              <td>{formatMillimeter(plan.totalRemainder)}</td>
            </tr>
            <tr>
              <th>사용률</th>
              <td>{formatPercent(plan.utilizationRate)}</td>
              <th>절단 손실</th>
              <td>{form.kerf || "0"}mm</td>
            </tr>
            <tr>
              <th>최적화 기준</th>
              <td>{getOptimizationModeLabel(plan.optimizationMode)}</td>
              <th>작업 변경</th>
              <td>
                길이 {plan.score.lengthChangeCount}회 / 원자재 {plan.score.stockChangeCount}회
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>2. 현장 작업 순서</h2>
        <table className="report-table report-cut-table">
          <thead>
            <tr>
              <th>순서</th>
              <th>작업 블록</th>
              <th>세부 지시</th>
              <th>확인</th>
            </tr>
          </thead>
          <tbody>
            {plan.workSteps.map((step) => (
              <tr key={step.id}>
                <td>{step.order}</td>
                <td>
                  {step.title}
                  <br />
                  <span className="report-muted">{step.subtitle}</span>
                </td>
                <td>{formatWorkStepCuts(step)}</td>
                <td className="check-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>3. 입력 절단 목록</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>절단 길이</th>
              <th>수량</th>
              <th>확인</th>
            </tr>
          </thead>
          <tbody>
            {printableItems.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.length}mm</td>
                <td>{item.quantity}개</td>
                <td className="check-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>4. 반복 절단 패턴</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>패턴</th>
              <th>반복</th>
              <th>절단 구성</th>
              <th>남는 길이</th>
            </tr>
          </thead>
          <tbody>
            {plan.patterns.map((pattern, index) => (
              <tr key={pattern.id}>
                <td>{index + 1}</td>
                <td>{pattern.count}회</td>
                <td>{formatCutList(pattern.cuts)}</td>
                <td>{formatMillimeter(pattern.remainder)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>5. 원자재별 절단 지시</h2>
        <table className="report-table report-cut-table">
          <thead>
            <tr>
              <th>원자재</th>
              <th>절단 순서</th>
              <th>남는 길이</th>
              <th>작업자 확인</th>
            </tr>
          </thead>
          <tbody>
            {plan.bars.map((bar, index) => (
              <tr key={bar.id}>
                <td>{index + 1}</td>
                <td>{formatCutList(bar.cuts.map((cut) => cut.length))}</td>
                <td>{formatMillimeter(bar.remainder)}</td>
                <td className="check-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section report-notes">
        <h2>6. 작업 전 확인</h2>
        <ul>
          <li>절단 전 원자재 길이와 입력 치수를 다시 확인하세요.</li>
          <li>절단 손실값이 실제 장비 조건과 맞는지 확인하세요.</li>
          <li>같은 반복 패턴은 먼저 묶어서 절단하면 작업 실수를 줄일 수 있습니다.</li>
        </ul>
      </section>
    </section>
  );
}
