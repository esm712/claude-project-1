import { formatBalance, formatDate } from "@/lib/format";
import type { Standing } from "@/lib/types";

type Props = {
  standings: Standing[];
  presentIds: number[];
  nextDutyId: number | null;
};

export function StandingsTable({ standings, presentIds, nextDutyId }: Props) {
  const active = standings.filter((s) => s.active);
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">잔액 현황</h2>
      <p className="mb-3 text-sm opacity-70">잔액 = 사준 잔 − 얻어 마신 잔. 잔액이 가장 낮은 사람이 다음 당번이에요.</p>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>
            <th className="py-2">이름</th>
            <th className="py-2 text-right">잔액</th>
            <th className="py-2 text-right">사준 잔</th>
            <th className="py-2 text-right">얻어 마신 잔</th>
            <th className="py-2 text-right">마지막 구매</th>
          </tr>
        </thead>
        <tbody>
          {active.map((s) => (
            <tr key={s.memberId} className="border-b border-black/5 dark:border-white/10">
              <th scope="row" className="py-2 font-medium">
                {s.name}
                {s.memberId === nextDutyId && (
                  <span className="ml-2 rounded bg-amber-700 px-1.5 py-0.5 text-xs text-white">당번</span>
                )}
                {!presentIds.includes(s.memberId) && (
                  <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/15">불참</span>
                )}
              </th>
              <td className="py-2 text-right tabular-nums">{formatBalance(s.balance)}</td>
              <td className="py-2 text-right tabular-nums">{s.cupsGiven}</td>
              <td className="py-2 text-right tabular-nums">{s.cupsReceived}</td>
              <td className="py-2 text-right">{s.lastPurchasedAt ? formatDate(s.lastPurchasedAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
