import type { GeneratedCutItem, MaterialGroup } from "@/lib/windowRules";
import type { WindowFormState } from "./WindowInputForm";

type PrintGeneratedCutListReportProps = {
  form: WindowFormState;
  generatedItems: GeneratedCutItem[];
  generatedAt: Date | null;
};

const materialGroupOrder: MaterialGroup[] = ["frame", "sash", "screen"];

// 숫자 길이를 보고서용 밀리미터 문자열로 변환한다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
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

// 산출된 절단 항목을 부품군 순서대로 묶는다.
function groupGeneratedItems(items: GeneratedCutItem[]): Array<{
  group: MaterialGroup;
  groupLabel: string;
  items: GeneratedCutItem[];
}> {
  return materialGroupOrder
    .map((group) => {
      const groupItems = items.filter((item) => item.group === group);

      return {
        group,
        groupLabel: groupItems[0]?.groupLabel ?? "",
        items: groupItems
      };
    })
    .filter((group) => group.items.length > 0);
}

// 부품군별 절단 길이 산출물을 인쇄용 보고서로 렌더링한다.
export function PrintGeneratedCutListReport({
  form,
  generatedItems,
  generatedAt
}: PrintGeneratedCutListReportProps) {
  const groupedItems = groupGeneratedItems(generatedItems);

  return (
    <section className="print-report" aria-label="부품군별 절단 길이 산출물">
      <header className="report-header">
        <div>
          <p className="report-kicker">How2Cut</p>
          <h1>부품군별 절단 길이 산출물</h1>
        </div>
        <div className="report-meta">
          <p>출력일: {formatDateTime(generatedAt)}</p>
          <p>문 종류: 정양쪽문</p>
        </div>
      </header>

      <section className="report-section">
        <h2>1. 창문 정보</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>미서기 규격</th>
              <td>{form.slidingSize}</td>
              <th>방충망</th>
              <td>{form.hasScreen ? "포함" : "없음"}</td>
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
              <th>확인</th>
              <td className="check-cell" />
            </tr>
          </tbody>
        </table>
      </section>

      {groupedItems.map((group, groupIndex) => (
        <section key={group.group} className="report-section">
          <h2>{groupIndex + 2}. {group.groupLabel} 산출 목록</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>부품명</th>
                <th>길이</th>
                <th>수량</th>
                <th>계산 근거</th>
                <th>확인</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.sourceLabels.join(" / ")}</td>
                  <td>{formatMillimeter(item.length)}</td>
                  <td>{item.quantity}개</td>
                  <td>{item.formulaNotes.join(", ")}</td>
                  <td className="check-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  );
}
