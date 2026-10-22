import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Purchase } from "@/lib/types";
import { members } from "@/test/fixtures";
import { PurchaseHistory } from "./PurchaseHistory";

const purchases: Purchase[] = [
  {
    id: 2,
    buyer: { id: 1, name: "철수" },
    participants: [
      { id: 1, name: "철수" },
      { id: 2, name: "영희" },
    ],
    cups: 2,
    purchasedAt: "2026-10-21",
    memo: "민수 휴가",
    createdAt: "2026-10-21T01:00:00Z",
  },
  {
    id: 1,
    buyer: { id: 3, name: "민수" },
    participants: [
      { id: 1, name: "철수" },
      { id: 2, name: "영희" },
      { id: 3, name: "민수" },
    ],
    cups: 3,
    purchasedAt: "2026-10-20",
    memo: null,
    createdAt: "2026-10-20T01:00:00Z",
  },
];

const onUpdate = vi.fn<(id: number, input: unknown) => Promise<void>>();
const onDelete = vi.fn<(id: number) => Promise<void>>();

beforeEach(() => {
  onUpdate.mockReset().mockResolvedValue(undefined);
  onDelete.mockReset().mockResolvedValue(undefined);
});

function renderHistory(list = purchases, memberList = members) {
  render(<PurchaseHistory purchases={list} members={memberList} today="2026-10-22" onUpdate={onUpdate} onDelete={onDelete} />);
}

const item = (label: string) => screen.getByRole("listitem", { name: label });

describe("PurchaseHistory", () => {
  it("lists purchases in the given order with buyer, cups, participants and memo", () => {
    renderHistory();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("10월 21일 (수)");
    expect(items[0]).toHaveTextContent("철수님이 2잔 (철수, 영희)");
    expect(items[0]).toHaveTextContent("민수 휴가");
    expect(items[1]).toHaveTextContent("민수님이 3잔 (철수, 영희, 민수)");
  });

  it("says when there is nothing yet", () => {
    renderHistory([]);
    expect(screen.getByText("아직 기록이 없어요.")).toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHistory();

    await userEvent.click(within(item("2026-10-20 민수")).getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("민수님 3잔"));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("does not delete when the confirmation is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHistory();

    await userEvent.click(within(item("2026-10-20 민수")).getByRole("button", { name: "삭제" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows an error when deleting fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    onDelete.mockRejectedValue(new ApiError(404, "purchase 1 not found"));
    renderHistory();

    await userEvent.click(within(item("2026-10-20 민수")).getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("purchase 1 not found");
  });

  it("edits a purchase in place with its current values", async () => {
    renderHistory();

    await userEvent.click(within(item("2026-10-21 철수")).getByRole("button", { name: "수정" }));
    const form = screen.getByRole("form", { name: "구매 기록" });
    expect(within(form).getByRole("combobox", { name: "산 사람" })).toHaveDisplayValue("철수");
    expect(within(form).getByLabelText("날짜")).toHaveValue("2026-10-21");
    expect(within(form).getByLabelText("메모 (선택)")).toHaveValue("민수 휴가");

    await userEvent.selectOptions(within(form).getByRole("combobox", { name: "산 사람" }), "영희");
    await userEvent.click(within(form).getByRole("button", { name: "수정하기" }));

    expect(onUpdate).toHaveBeenCalledWith(2, {
      buyerId: 2,
      participantIds: [1, 2],
      purchasedAt: "2026-10-21",
      memo: "민수 휴가",
    });
    expect(screen.queryByRole("form", { name: "구매 기록" })).not.toBeInTheDocument();
  });

  it("keeps the form open when the update fails", async () => {
    onUpdate.mockRejectedValue(new ApiError(400, "purchasedAt must not be in the future"));
    renderHistory();

    await userEvent.click(within(item("2026-10-21 철수")).getByRole("button", { name: "수정" }));
    await userEvent.click(screen.getByRole("button", { name: "수정하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("future");
    expect(screen.getByRole("form", { name: "구매 기록" })).toBeInTheDocument();
  });

  it("keeps a since-deactivated participant selectable when editing", async () => {
    renderHistory(purchases, members.filter((m) => m.id !== 3));

    await userEvent.click(within(item("2026-10-20 민수")).getByRole("button", { name: "수정" }));

    const form = screen.getByRole("form", { name: "구매 기록" });
    expect(within(form).getByRole("combobox", { name: "산 사람" })).toHaveDisplayValue("민수");
    expect(within(form).getByRole("checkbox", { name: "민수" })).toBeChecked();
  });
});
