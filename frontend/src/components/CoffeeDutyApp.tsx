"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createMember,
  createPurchase,
  deletePurchase,
  fetchDuty,
  fetchMembers,
  fetchPurchases,
  updateMember,
  updatePurchase,
} from "@/lib/api";
import { errorMessage, todayIso } from "@/lib/format";
import type { Duty, Member, Purchase, PurchaseInput } from "@/lib/types";
import { AttendancePicker } from "./AttendancePicker";
import { DutyCard } from "./DutyCard";
import { MemberManager } from "./MemberManager";
import { PurchaseForm } from "./PurchaseForm";
import { PurchaseHistory } from "./PurchaseHistory";
import { StandingsTable } from "./StandingsTable";

export function CoffeeDutyApp() {
  const [allMembers, setAllMembers] = useState<Member[] | null>(null);
  const members = useMemo(() => allMembers?.filter((m) => m.active) ?? null, [allMembers]);
  const [presentIds, setPresentIds] = useState<number[]>([]);
  const [duty, setDuty] = useState<Duty | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [managingMembers, setManagingMembers] = useState(false);
  // bumped after every change so derived data is fetched again
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetchMembers(true)
      .then((loaded) => {
        if (ignore) return;
        setAllMembers(loaded);
        setPresentIds(loaded.filter((m) => m.active).map((m) => m.id));
        setManagingMembers(loaded.length === 0);
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
  }, [members, presentIds, version]);

  useEffect(() => {
    let ignore = false;
    fetchPurchases()
      .then((loaded) => {
        if (!ignore) setPurchases(loaded);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(errorMessage(e));
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  function replaceMember(updated: Member) {
    setAllMembers((list) => list?.map((m) => (m.id === updated.id ? updated : m)) ?? null);
  }

  function setPresent(id: number, present: boolean) {
    setPresentIds((ids) => {
      const rest = ids.filter((i) => i !== id);
      return present ? [...rest, id].sort((a, b) => a - b) : rest;
    });
  }

  async function addMember(name: string) {
    const created = await createMember(name);
    setAllMembers((list) => [...(list ?? []), created]);
    setPresent(created.id, true);
    setNotice(`${created.name}님을 추가했어요.`);
  }

  async function renameMember(id: number, name: string) {
    replaceMember(await updateMember(id, { name }));
    setVersion((v) => v + 1);
  }

  async function setMemberActive(id: number, active: boolean) {
    const updated = await updateMember(id, { active });
    replaceMember(updated);
    setPresent(id, active);
    setNotice(`${updated.name}님을 ${active ? "다시 활성화" : "비활성화"}했어요.`);
  }

  async function editPurchase(id: number, input: PurchaseInput) {
    await updatePurchase(id, input);
    setNotice("기록을 수정했어요.");
    setVersion((v) => v + 1);
  }

  async function removePurchase(id: number) {
    await deletePurchase(id);
    setNotice("기록을 삭제했어요.");
    setVersion((v) => v + 1);
  }

  async function recordPurchase(input: PurchaseInput) {
    const saved = await createPurchase(input);
    setRecording(false);
    setNotice(`${saved.buyer.name}님이 ${saved.cups}잔 산 것을 기록했어요.`);
    setVersion((v) => v + 1);
  }

  function startRecording() {
    setNotice(null);
    setRecording(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">☕ 커피 당번</h1>

      {error && (
        <p role="alert" className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-lg bg-green-100 px-4 py-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
          {notice}
        </p>
      )}

      {members === null && !error && <p>불러오는 중…</p>}

      {members !== null && members.length === 0 && <p>아직 등록된 멤버가 없어요. 아래에서 멤버를 추가해 주세요.</p>}

      {members !== null && members.length > 0 && (
        <>
          <AttendancePicker members={members} presentIds={presentIds} onChange={setPresentIds} />
          {duty && (
            <>
              <DutyCard duty={duty} />
              {recording ? (
                <PurchaseForm
                  members={members}
                  initial={{
                    buyerId: duty.nextDuty?.id ?? presentIds[0] ?? members[0].id,
                    participantIds: presentIds,
                    purchasedAt: todayIso(),
                    memo: "",
                  }}
                  today={todayIso()}
                  submitLabel="기록하기"
                  onSubmit={recordPurchase}
                  onCancel={() => setRecording(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={members.length < 2}
                  className="rounded-xl bg-amber-800 px-4 py-3 text-lg font-semibold text-white disabled:opacity-40"
                >
                  ☕ 커피 샀어요
                </button>
              )}
              <StandingsTable standings={duty.standings} presentIds={presentIds} nextDutyId={duty.nextDuty?.id ?? null} />
            </>
          )}
          {purchases && (
            <PurchaseHistory
              purchases={purchases}
              members={members}
              today={todayIso()}
              onUpdate={editPurchase}
              onDelete={removePurchase}
            />
          )}
        </>
      )}

      {allMembers !== null && (
        <details
          open={managingMembers}
          onToggle={(e) => setManagingMembers(e.currentTarget.open)}
          className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <summary className="cursor-pointer font-semibold">멤버 관리</summary>
          <div className="mt-3">
            <MemberManager members={allMembers} onAdd={addMember} onRename={renameMember} onSetActive={setMemberActive} />
          </div>
        </details>
      )}
    </main>
  );
}
