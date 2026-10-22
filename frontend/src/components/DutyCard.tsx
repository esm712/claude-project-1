import { formatBalance } from "@/lib/format";
import type { Duty } from "@/lib/types";

export function DutyCard({ duty }: { duty: Duty }) {
  const next = duty.nextDuty;
  if (!next) {
    return (
      <section aria-label="오늘의 당번" className="rounded-2xl bg-black/5 p-6 text-center dark:bg-white/10">
        <p>오늘은 2명 이상 있어야 당번을 정할 수 있어요.</p>
      </section>
    );
  }

  const standing = duty.standings.find((s) => s.memberId === next.id);
  return (
    <section aria-label="오늘의 당번" className="rounded-2xl bg-amber-800 p-6 text-center text-white">
      <p className="text-sm opacity-80">오늘의 당번</p>
      <p className="mt-1 text-4xl font-bold">{next.name}</p>
      {standing && (
        <p className="mt-2 text-sm opacity-80">
          잔액 {formatBalance(standing.balance)} · 오늘 있는 사람 중 가장 적게 샀어요
        </p>
      )}
    </section>
  );
}
