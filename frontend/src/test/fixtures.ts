import type { Duty, Member, Standing } from "@/lib/types";

export const members: Member[] = [
  { id: 1, name: "철수", active: true },
  { id: 2, name: "영희", active: true },
  { id: 3, name: "민수", active: true },
];

export function standing(memberId: number, overrides: Partial<Standing> = {}): Standing {
  const member = members.find((m) => m.id === memberId)!;
  return {
    memberId,
    name: member.name,
    active: true,
    balance: 0,
    cupsGiven: 0,
    cupsReceived: 0,
    purchaseCount: 0,
    lastPurchasedAt: null,
    ...overrides,
  };
}

export function duty(nextDutyId: number | null, presentMemberIds = [1, 2, 3], standings = [1, 2, 3].map((id) => standing(id))): Duty {
  const next = members.find((m) => m.id === nextDutyId);
  return {
    nextDuty: next ? { id: next.id, name: next.name } : null,
    presentMemberIds,
    standings,
  };
}
