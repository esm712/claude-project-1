import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { duty, members } from "@/test/fixtures";
import { CoffeeDutyApp } from "./CoffeeDutyApp";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchMembers: vi.fn(), fetchDuty: vi.fn() };
});

const fetchMembers = vi.mocked(api.fetchMembers);
const fetchDuty = vi.mocked(api.fetchDuty);

beforeEach(() => {
  fetchMembers.mockReset().mockResolvedValue(members);
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
});
