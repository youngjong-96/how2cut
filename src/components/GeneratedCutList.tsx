import { Printer } from "lucide-react";
import type { GeneratedCutItem, MaterialGroup } from "@/lib/windowRules";

type GeneratedCutListProps = {
  items: GeneratedCutItem[];
  onPrint: () => void;
};

const materialGroupOrder: MaterialGroup[] = ["frame", "sash", "screen"];

// 숫자 길이를 작업자가 읽기 쉬운 밀리미터 문자열로 바꾼다.
function formatMillimeter(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

// 산출된 절단 목록을 부품군 순서대로 묶는다.
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

// 창문 규격에서 자동 산출된 부품군별 절단 목록을 렌더링한다.
export function GeneratedCutList({ items, onPrint }: GeneratedCutListProps) {
  const groupedItems = groupGeneratedItems(items);

  return (
    <section className="rounded-xl border-2 border-stickerOrange/35 bg-[#fffdf8] p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-semibold text-brand">
            산출 목록
          </p>
          <h2 className="mt-3 text-xl font-bold leading-tight text-ink">부품군별 절단 길이</h2>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="no-print inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-sm font-semibold text-ink transition hover:bg-paper"
        >
          <Printer size={17} aria-hidden="true" />
          산출물 인쇄
        </button>
      </div>

      {groupedItems.length > 0 ? (
        <div className="space-y-4">
          {groupedItems.map((group) => (
            <div key={group.group}>
              <h3 className="mb-2 text-sm font-bold text-ink">{group.groupLabel}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-hairline bg-paper p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-brand">{item.sourceLabels.join(" / ")}</p>
                        <p className="mt-0.5 text-lg font-bold text-ink">{formatMillimeter(item.length)}</p>
                      </div>
                      <p className="rounded-full bg-canvas px-2.5 py-1 text-sm font-semibold text-brand">
                        {item.quantity}개
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-faint">{item.formulaNotes.join(", ")}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-hairline bg-paper p-4 text-sm text-muted">
          계산 가능한 절단 목록이 없습니다.
        </p>
      )}
    </section>
  );
}
