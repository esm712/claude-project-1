// Mirrors the Spring Boot API responses (backend/README.md).

export type Member = {
  id: number;
  name: string;
  active: boolean;
};

export type MemberRef = {
  id: number;
  name: string;
};

export type Purchase = {
  id: number;
  buyer: MemberRef;
  participants: MemberRef[];
  cups: number;
  /** yyyy-MM-dd */
  purchasedAt: string;
  memo: string | null;
  createdAt: string;
};

export type PurchaseInput = {
  buyerId: number;
  /** The backend adds the buyer if missing. */
  participantIds: number[];
  /** yyyy-MM-dd, defaults to today on the server */
  purchasedAt?: string;
  memo?: string;
};

export type Standing = {
  memberId: number;
  name: string;
  active: boolean;
  /** cupsGiven - cupsReceived */
  balance: number;
  cupsGiven: number;
  cupsReceived: number;
  purchaseCount: number;
  lastPurchasedAt: string | null;
};

export type Duty = {
  /** null when fewer than two members are present */
  nextDuty: MemberRef | null;
  presentMemberIds: number[];
  standings: Standing[];
};
