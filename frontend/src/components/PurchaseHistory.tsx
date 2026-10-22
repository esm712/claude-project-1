"use client";

import { useState } from "react";
import { errorMessage, formatDate } from "@/lib/format";
import type { Member, Purchase, PurchaseInput } from "@/lib/types";
import { PurchaseForm } from "./PurchaseForm";

type Props = {
  purchases: Purchase[];
  /** active members; anyone already on a purchase stays selectable when editing it */
  members: Member[];
  today: string;
  onUpdate: (id: number, input: PurchaseInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export function PurchaseHistory({ purchases, members, today, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(purchase: Purchase) {
    const label = `${formatDate(purchase.purchasedAt)} ${purchase.buyer.name}님 ${purchase.cups}잔`;
    if (!window.confirm(`${label} 기록을 삭제할까요?`)) return;
    setError(null);
    try {
      await onDelete(purchase.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function update(id: number, input: PurchaseInput) {
    await onUpdate(id, input);
    setEditingId(null);
  }

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">구매 기록</h2>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {purchases.length === 0 ? (
        <p className="text-sm opacity-70">아직 기록이 없어요.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {purchases.map((purchase) =>
            purchase.id === editingId ? (
              <li key={purchase.id} className="py-3">
                <PurchaseForm
                  members={withParticipants(members, purchase)}
                  initial={{
                    buyerId: purchase.buyer.id,
                    participantIds: purchase.participants.map((p) => p.id),
                    purchasedAt: purchase.purchasedAt,
                    memo: purchase.memo ?? "",
                  }}
                  today={today}
                  submitLabel="수정하기"
                  onSubmit={(input) => update(purchase.id, input)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={purchase.id} aria-label={`${purchase.purchasedAt} ${purchase.buyer.name}`} className="flex items-start gap-3 py-3">
                <div className="flex-1">
                  <p className="text-sm opacity-70">{formatDate(purchase.purchasedAt)}</p>
                  <p>
                    <span className="font-semibold">{purchase.buyer.name}</span>님이 {purchase.cups}잔 (
                    {purchase.participants.map((p) => p.name).join(", ")})
                  </p>
                  {purchase.memo && <p className="text-sm opacity-70">{purchase.memo}</p>}
                </div>
                <button type="button" onClick={() => setEditingId(purchase.id)} className="text-sm underline">
                  수정
                </button>
                <button type="button" onClick={() => remove(purchase)} className="text-sm text-red-700 underline dark:text-red-300">
                  삭제
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function withParticipants(members: Member[], purchase: Purchase): Member[] {
  const known = new Set(members.map((m) => m.id));
  const missing = purchase.participants.filter((p) => !known.has(p.id)).map((p) => ({ ...p, active: false }));
  return [...members, ...missing].sort((a, b) => a.id - b.id);
}
