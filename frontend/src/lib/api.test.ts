import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createMember,
  createPurchase,
  deletePurchase,
  fetchDuty,
  fetchMembers,
  fetchPurchases,
  updateMember,
  updatePurchase,
} from "./api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return {
    url,
    method: init?.method ?? "GET",
    body: init?.body ? JSON.parse(init.body as string) : undefined,
    headers: init?.headers,
  };
}

describe("members", () => {
  it("lists active members by default", async () => {
    respond(200, [{ id: 1, name: "철수", active: true }]);

    await expect(fetchMembers()).resolves.toEqual([{ id: 1, name: "철수", active: true }]);
    expect(lastCall()).toMatchObject({ url: "/api/members", method: "GET" });
  });

  it("asks for inactive members when requested", async () => {
    respond(200, []);
    await fetchMembers(true);
    expect(lastCall().url).toBe("/api/members?includeInactive=true");
  });

  it("creates a member with a JSON body", async () => {
    respond(201, { id: 4, name: "지수", active: true });

    await createMember("지수");

    expect(lastCall()).toMatchObject({
      url: "/api/members",
      method: "POST",
      body: { name: "지수" },
      headers: { "Content-Type": "application/json" },
    });
  });

  it("patches only the given fields", async () => {
    respond(200, { id: 2, name: "영희", active: false });
    await updateMember(2, { active: false });
    expect(lastCall()).toMatchObject({ url: "/api/members/2", method: "PATCH", body: { active: false } });
  });
});

describe("purchases", () => {
  const input = { buyerId: 1, participantIds: [1, 2], purchasedAt: "2026-10-22", memo: "아아" };

  it("lists purchases", async () => {
    respond(200, []);
    await fetchPurchases();
    expect(lastCall()).toMatchObject({ url: "/api/purchases", method: "GET" });
  });

  it("creates a purchase", async () => {
    respond(201, { id: 9 });
    await createPurchase(input);
    expect(lastCall()).toMatchObject({ url: "/api/purchases", method: "POST", body: input });
  });

  it("replaces a purchase on update", async () => {
    respond(200, { id: 9 });
    await updatePurchase(9, input);
    expect(lastCall()).toMatchObject({ url: "/api/purchases/9", method: "PUT", body: input });
  });

  it("deletes a purchase and resolves with no body on 204", async () => {
    respond(204);
    await expect(deletePurchase(9)).resolves.toBeUndefined();
    expect(lastCall()).toMatchObject({ url: "/api/purchases/9", method: "DELETE", headers: undefined });
  });
});

describe("duty", () => {
  it("uses every active member when attendance is not given", async () => {
    respond(200, { nextDuty: null, presentMemberIds: [], standings: [] });
    await fetchDuty();
    expect(lastCall().url).toBe("/api/duty");
  });

  it("sends who is present", async () => {
    respond(200, { nextDuty: { id: 1, name: "철수" }, presentMemberIds: [1, 2], standings: [] });

    const duty = await fetchDuty([1, 2]);

    expect(lastCall().url).toBe("/api/duty?present=1,2");
    expect(duty.nextDuty).toEqual({ id: 1, name: "철수" });
  });
});

describe("errors", () => {
  it("surfaces the problem detail from the backend", async () => {
    respond(400, { status: 400, title: "Bad Request", detail: "purchasedAt must not be in the future" });

    const error = await createPurchase({ buyerId: 1, participantIds: [2] }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: "purchasedAt must not be in the future" });
  });

  it("falls back to the title when there is no detail", async () => {
    respond(409, { status: 409, title: "Conflict" });
    await expect(createMember("철수")).rejects.toMatchObject({ status: 409, message: "Conflict" });
  });

  it("falls back to the status when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Bad Gateway</html>", { status: 502 }));
    await expect(fetchPurchases()).rejects.toMatchObject({ status: 502, message: "HTTP 502" });
  });

  it("lets network failures propagate", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(fetchMembers()).rejects.toThrow("Failed to fetch");
  });
});
