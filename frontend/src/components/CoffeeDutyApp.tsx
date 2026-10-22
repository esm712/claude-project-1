"use client";

import { useEffect, useState } from "react";
import { fetchDuty, fetchMembers } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Duty, Member } from "@/lib/types";
import { AttendancePicker } from "./AttendancePicker";
import { DutyCard } from "./DutyCard";
import { StandingsTable } from "./StandingsTable";

export function CoffeeDutyApp() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [presentIds, setPresentIds] = useState<number[]>([]);
  const [duty, setDuty] = useState<Duty | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchMembers()
      .then((loaded) => {
        if (ignore) return;
        setMembers(loaded);
        setPresentIds(loaded.map((m) => m.id));
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (members === null) return;
    // ignore responses for attendance that has since changed
    let ignore = false;
    fetchDuty(presentIds)
      .then((loaded) => {
        if (ignore) return;
        setDuty(loaded);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, [members, presentIds]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">☕ 커피 당번</h1>

      {error && (
        <p role="alert" className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {members === null && !error && <p>불러오는 중…</p>}

      {members !== null && members.length === 0 && <p>아직 등록된 멤버가 없어요. 먼저 멤버를 추가해 주세요.</p>}

      {members !== null && members.length > 0 && (
        <>
          <AttendancePicker members={members} presentIds={presentIds} onChange={setPresentIds} />
          {duty && (
            <>
              <DutyCard duty={duty} />
              <StandingsTable standings={duty.standings} presentIds={presentIds} nextDutyId={duty.nextDuty?.id ?? null} />
            </>
          )}
        </>
      )}
    </main>
  );
}
