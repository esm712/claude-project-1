import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { duty, members } from "@/test/fixtures";
import type { Purchase } from "@/lib/types";
import { CoffeeDutyApp } from "./CoffeeDutyApp";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchMembers: vi.fn(),
    fetchDuty: vi.fn(),
    fetchPurchases: vi.fn(),
    createPurchase: vi.fn(),
    updatePurchase: vi.fn(),
    deletePurchase: vi.fn(),
  };
});

const fetchMembers = vi.mocked(api.fetchMembers);
const fetchDuty = vi.mocked(api.fetchDuty);
const createPurchase = vi.mocked(api.createPurchase);
const fetchPurchases = vi.mocked(api.fetchPurchases);
const updatePurchase = vi.mocked(api.updatePurchase);
const deletePurchase = vi.mocked(api.deletePurchase);

beforeEach(() => {
  fetchMembers.mockReset().mockResolvedValue(members);
  createPurchase.mockReset();
  fetchPurchases.mockReset().mockResolvedValue([]);
  updatePurchase.mockReset();
  deletePurchase.mockReset();
  fetchDuty.mockReset().mockImplementation(async (present = [1, 2, 3]) => duty(present.length >= 2 ? present[0] : null, present));
});

describe("CoffeeDutyApp", () => {
  it("starts with everyone present and shows the duty", async () => {
    render(<CoffeeDutyApp />);

    expect(await screen.findByRole("region", { name: "오늘의 당번" })).toHaveTextContent("철수");
    expect(fetchDuty).toHaveBeenLastCalledWith([1, 2, 3]);
  });

  it("recomputes the duty when someone is marked absent", async () => {
    render(<CoffeeDutyApp />);
    await screen.findByRole("region", { name: "오늘의 당번" });

    await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));

    await waitFor(() => expect(screen.getByRole("region", { name: "오늘의 당번" })).toHaveTextContent("영희"));
    expect(fetchDuty).toHaveBeenLastCalledWith([2, 3]);
  });

  it("shows no duty when only one person is in", async () => {
    render(<CoffeeDutyApp />);
    await screen.findByRole("region", { name: "오늘의 당번" });

    await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "영희" }));

    await waitFor(() => expect(screen.getByRole("region", { name: "오늘의 당번" })).toHaveTextContent("2명 이상"));
  });

  it("ignores a slow response for attendance that has since changed", async () => {
    let releaseSlow!: () => void;
    render(<CoffeeDutyApp />);
    await screen.findByRole("region", { name: "오늘의 당번" });

    fetchDuty.mockImplementationOnce(
      (present) => new Promise((resolve) => (releaseSlow = () => resolve(duty(3, present)))),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));
    await waitFor(() => expect(fetchDuty).toHaveBeenLastCalledWith([1, 2, 3]));

    releaseSlow();

    await waitFor(() => expect(screen.getByRole("region", { name: "오늘의 당번" })).toHaveTextContent("철수"));
    expect(screen.getByRole("region", { name: "오늘의 당번" })).not.toHaveTextContent("민수");
  });

  it("asks to add members when there are none", async () => {
    fetchMembers.mockResolvedValue([]);
    render(<CoffeeDutyApp />);

    expect(await screen.findByText(/아직 등록된 멤버가 없어요/)).toBeInTheDocument();
  });

  it("shows an error when the backend is unreachable", async () => {
    fetchMembers.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<CoffeeDutyApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent("서버에 연결하지 못했어요");
  });

  describe("recording a purchase", () => {
    const saved: Purchase = {
      id: 1,
      buyer: { id: 2, name: "영희" },
      participants: [
        { id: 2, name: "영희" },
        { id: 3, name: "민수" },
      ],
      cups: 2,
      purchasedAt: "2026-10-22",
      memo: null,
      createdAt: "2026-10-22T01:00:00Z",
    };

    it("prefills the form with today's duty and attendance", async () => {
      render(<CoffeeDutyApp />);
      await screen.findByRole("region", { name: "오늘의 당번" });
      await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));
      await waitFor(() => expect(screen.getByRole("region", { name: "오늘의 당번" })).toHaveTextContent("영희"));

      await userEvent.click(screen.getByRole("button", { name: /커피 샀어요/ }));

      const form = screen.getByRole("form", { name: "구매 기록" });
      expect(within(form).getByRole("combobox", { name: "산 사람" })).toHaveDisplayValue("영희");
      expect(within(form).getByRole("checkbox", { name: "철수" })).not.toBeChecked();
      expect(within(form).getByRole("checkbox", { name: "민수" })).toBeChecked();
    });

    it("saves, closes the form, confirms and refreshes the duty", async () => {
      createPurchase.mockResolvedValue(saved);
      render(<CoffeeDutyApp />);
      await screen.findByRole("region", { name: "오늘의 당번" });
      await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));
      await waitFor(() => expect(fetchDuty).toHaveBeenLastCalledWith([2, 3]));
      const callsBefore = fetchDuty.mock.calls.length;

      await userEvent.click(screen.getByRole("button", { name: /커피 샀어요/ }));
      await userEvent.click(screen.getByRole("button", { name: "기록하기" }));

      expect(createPurchase).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 2, participantIds: [2, 3] }));
      expect(await screen.findByRole("status")).toHaveTextContent("영희님이 2잔 산 것을 기록했어요.");
      expect(screen.queryByRole("form", { name: "구매 기록" })).not.toBeInTheDocument();
      await waitFor(() => expect(fetchDuty.mock.calls.length).toBeGreaterThan(callsBefore));
      expect(fetchDuty).toHaveBeenLastCalledWith([2, 3]);
    });

    it("keeps the form open with the error when saving fails", async () => {
      createPurchase.mockRejectedValue(new api.ApiError(400, "member 2 is inactive"));
      render(<CoffeeDutyApp />);
      await screen.findByRole("region", { name: "오늘의 당번" });

      await userEvent.click(screen.getByRole("button", { name: /커피 샀어요/ }));
      await userEvent.click(screen.getByRole("button", { name: "기록하기" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("member 2 is inactive");
      expect(screen.getByRole("form", { name: "구매 기록" })).toBeInTheDocument();
    });

    it("closes the form on cancel without saving", async () => {
      render(<CoffeeDutyApp />);
      await screen.findByRole("region", { name: "오늘의 당번" });

      await userEvent.click(screen.getByRole("button", { name: /커피 샀어요/ }));
      await userEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(screen.queryByRole("form", { name: "구매 기록" })).not.toBeInTheDocument();
      expect(createPurchase).not.toHaveBeenCalled();
    });
  });

  describe("purchase history", () => {
    const existing: Purchase = {
      id: 7,
      buyer: { id: 1, name: "철수" },
      participants: [
        { id: 1, name: "철수" },
        { id: 2, name: "영희" },
      ],
      cups: 2,
      purchasedAt: "2026-10-21",
      memo: null,
      createdAt: "2026-10-21T01:00:00Z",
    };

    it("lists recorded purchases", async () => {
      fetchPurchases.mockResolvedValue([existing]);
      render(<CoffeeDutyApp />);

      expect(await screen.findByRole("listitem", { name: "2026-10-21 철수" })).toHaveTextContent("철수님이 2잔");
    });

    it("reloads history and duty after recording", async () => {
      createPurchase.mockResolvedValue(existing);
      render(<CoffeeDutyApp />);
      await screen.findByText("아직 기록이 없어요.");
      fetchPurchases.mockResolvedValue([existing]);

      await userEvent.click(screen.getByRole("button", { name: /커피 샀어요/ }));
      await userEvent.click(screen.getByRole("button", { name: "기록하기" }));

      expect(await screen.findByRole("listitem", { name: "2026-10-21 철수" })).toBeInTheDocument();
    });

    it("deletes a purchase and refreshes the duty", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      fetchPurchases.mockResolvedValue([existing]);
      deletePurchase.mockResolvedValue(undefined);
      render(<CoffeeDutyApp />);
      const item = await screen.findByRole("listitem", { name: "2026-10-21 철수" });
      await screen.findByRole("region", { name: "오늘의 당번" });
      const dutyCalls = fetchDuty.mock.calls.length;
      fetchPurchases.mockResolvedValue([]);

      await userEvent.click(within(item).getByRole("button", { name: "삭제" }));

      expect(deletePurchase).toHaveBeenCalledWith(7);
      expect(await screen.findByRole("status")).toHaveTextContent("기록을 삭제했어요.");
      expect(await screen.findByText("아직 기록이 없어요.")).toBeInTheDocument();
      expect(fetchDuty.mock.calls.length).toBeGreaterThan(dutyCalls);
    });

    it("updates a purchase and refreshes", async () => {
      fetchPurchases.mockResolvedValue([existing]);
      updatePurchase.mockResolvedValue({ ...existing, buyer: { id: 2, name: "영희" } });
      render(<CoffeeDutyApp />);
      const item = await screen.findByRole("listitem", { name: "2026-10-21 철수" });

      await userEvent.click(within(item).getByRole("button", { name: "수정" }));
      await userEvent.selectOptions(screen.getByRole("combobox", { name: "산 사람" }), "영희");
      await userEvent.click(screen.getByRole("button", { name: "수정하기" }));

      expect(updatePurchase).toHaveBeenCalledWith(7, {
        buyerId: 2,
        participantIds: [1, 2],
        purchasedAt: "2026-10-21",
      });
      expect(await screen.findByRole("status")).toHaveTextContent("기록을 수정했어요.");
    });
  });
});
