"use client";

import { type FormEvent, useState } from "react";
import { errorMessage } from "@/lib/format";
import type { Member, PurchaseInput } from "@/lib/types";

export type PurchaseFormValues = {
  buyerId: number;
  participantIds: number[];
  purchasedAt: string;
  memo: string;
};

type Props = {
  members: Member[];
  initial: PurchaseFormValues;
  /** yyyy-MM-dd; later dates are rejected */
  today: string;
  submitLabel: string;
  onSubmit: (input: PurchaseInput) => Promise<void>;
  onCancel: () => void;
};

export function PurchaseForm({ members, initial, today, submitLabel, onSubmit, onCancel }: Props) {
  const [buyerId, setBuyerId] = useState(initial.buyerId);
  const [others, setOthers] = useState(() => new Set(initial.participantIds.filter((id) => id !== initial.buyerId)));
  const [purchasedAt, setPurchasedAt] = useState(initial.purchasedAt);
  const [memo, setMemo] = useState(initial.memo);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the buyer always drinks too
  const participantIds = members.map((m) => m.id).filter((id) => id === buyerId || others.has(id));
  const problem =
    participantIds.length < 2
      ? "구매자 말고 함께 마신 사람을 한 명 이상 골라 주세요."
      : !purchasedAt
        ? "날짜를 입력해 주세요."
        : purchasedAt > today
          ? "미래 날짜는 기록할 수 없어요."
          : null;

  function toggle(id: number, checked: boolean) {
    const next = new Set(others);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setOthers(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (problem || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = memo.trim();
      await onSubmit({ buyerId, participantIds, purchasedAt, ...(trimmed ? { memo: trimmed } : {}) });
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="구매 기록"
      className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/15"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        산 사람
        <select
          value={buyerId}
          onChange={(e) => setBuyerId(Number(e.target.value))}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 font-normal dark:border-white/20"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">함께 마신 사람 ({participantIds.length}잔)</legend>
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={m.id === buyerId || others.has(m.id)}
                disabled={m.id === buyerId}
                onChange={(e) => toggle(m.id, e.target.checked)}
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        날짜
        <input
          type="date"
          value={purchasedAt}
          max={today}
          onChange={(e) => setPurchasedAt(e.target.value)}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 font-normal dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        메모 (선택)
        <input
          type="text"
          value={memo}
          maxLength={200}
          placeholder="예: 아아 2, 라떼 1"
          onChange={(e) => setMemo(e.target.value)}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 font-normal dark:border-white/20"
        />
      </label>

      {problem && <p className="text-sm text-amber-800 dark:text-amber-300">{problem}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={problem !== null || submitting}
          className="flex-1 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "저장 중…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2 dark:border-white/20">
          취소
        </button>
      </div>
    </form>
  );
}
