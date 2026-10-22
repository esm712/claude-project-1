"use client";

import { type FormEvent, useState } from "react";
import { errorMessage } from "@/lib/format";
import type { Member } from "@/lib/types";

type Props = {
  /** every member, inactive included */
  members: Member[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onSetActive: (id: number, active: boolean) => Promise<void>;
};

export function MemberManager({ members, onAdd, onRename, onSetActive }: Props) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (await run(() => onAdd(trimmed))) setName("");
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const trimmed = editing.name.trim();
    if (!trimmed) return;
    if (await run(() => onRename(editing.id, trimmed))) setEditing(null);
  }

  return (
    <section aria-label="멤버 관리" className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
        {members.map((member) =>
          editing?.id === member.id ? (
            <li key={member.id} className="py-2">
              <form onSubmit={rename} className="flex gap-2">
                <input
                  aria-label="새 이름"
                  value={editing.name}
                  maxLength={30}
                  onChange={(e) => setEditing({ id: member.id, name: e.target.value })}
                  className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-1.5 dark:border-white/20"
                />
                <button type="submit" disabled={busy || !editing.name.trim()} className="text-sm underline disabled:opacity-40">
                  저장
                </button>
                <button type="button" onClick={() => setEditing(null)} className="text-sm underline">
                  취소
                </button>
              </form>
            </li>
          ) : (
            <li key={member.id} aria-label={member.name} className="flex items-center gap-3 py-2">
              <span className={member.active ? "flex-1" : "flex-1 line-through opacity-50"}>{member.name}</span>
              {!member.active && <span className="text-xs opacity-60">비활성</span>}
              <button type="button" onClick={() => setEditing({ id: member.id, name: member.name })} className="text-sm underline">
                이름 변경
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => onSetActive(member.id, !member.active))}
                className="text-sm underline disabled:opacity-40"
              >
                {member.active ? "비활성화" : "다시 활성화"}
              </button>
            </li>
          ),
        )}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input
          aria-label="새 멤버 이름"
          placeholder="이름"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          추가
        </button>
      </form>
      <p className="text-xs opacity-60">비활성화한 멤버는 당번과 출석에서 빠지지만, 지난 기록은 그대로 남아요.</p>
    </section>
  );
}
