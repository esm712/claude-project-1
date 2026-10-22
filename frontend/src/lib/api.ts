import type { Duty, Member, Purchase, PurchaseInput } from "./types";

/** A failed API call, carrying the RFC 9457 problem detail the backend sent when there was one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await problemMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function problemMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function fetchMembers(includeInactive = false): Promise<Member[]> {
  return request(`/api/members${includeInactive ? "?includeInactive=true" : ""}`);
}

export function createMember(name: string): Promise<Member> {
  return request("/api/members", json("POST", { name }));
}

export function updateMember(id: number, changes: { name?: string; active?: boolean }): Promise<Member> {
  return request(`/api/members/${id}`, json("PATCH", changes));
}

export function fetchPurchases(): Promise<Purchase[]> {
  return request("/api/purchases");
}

export function createPurchase(input: PurchaseInput): Promise<Purchase> {
  return request("/api/purchases", json("POST", input));
}

export function updatePurchase(id: number, input: PurchaseInput): Promise<Purchase> {
  return request(`/api/purchases/${id}`, json("PUT", input));
}

export function deletePurchase(id: number): Promise<void> {
  return request(`/api/purchases/${id}`, { method: "DELETE" });
}

/** @param presentIds who is in today; omit for every active member */
export function fetchDuty(presentIds?: number[]): Promise<Duty> {
  const query = presentIds ? `?present=${presentIds.join(",")}` : "";
  return request(`/api/duty${query}`);
}
