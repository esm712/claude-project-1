import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Member } from "@/lib/types";
import { members } from "@/test/fixtures";
import { MemberManager } from "./MemberManager";

const onAdd = vi.fn<(name: string) => Promise<void>>();
const onRename = vi.fn<(id: number, name: string) => Promise<void>>();
const onSetActive = vi.fn<(id: number, active: boolean) => Promise<void>>();

beforeEach(() => {
  onAdd.mockReset().mockResolvedValue(undefined);
  onRename.mockReset().mockResolvedValue(undefined);
  onSetActive.mockReset().mockResolvedValue(undefined);
});

function renderManager(list: Member[] = members) {
  render(<MemberManager members={list} onAdd={onAdd} onRename={onRename} onSetActive={onSetActive} />);
}

const row = (name: string) => screen.getByRole("listitem", { name });

describe("MemberManager", () => {
  it("adds a trimmed name and clears the input", async () => {
    renderManager();

    const input = screen.getByRole("textbox", { name: "새 멤버 이름" });
    await userEvent.type(input, "  지수 ");
    await userEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onAdd).toHaveBeenCalledWith("지수");
    expect(input).toHaveValue("");
  });

  it("does not add a blank name", async () => {
    renderManager();

    await userEvent.type(screen.getByRole("textbox", { name: "새 멤버 이름" }), "   ");

    expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
  });

  it("keeps the name and shows the error when adding fails", async () => {
    onAdd.mockRejectedValue(new ApiError(409, "member name already exists: 철수"));
    renderManager();

    await userEvent.type(screen.getByRole("textbox", { name: "새 멤버 이름" }), "철수");
    await userEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(screen.getByRole("textbox", { name: "새 멤버 이름" })).toHaveValue("철수");
  });

  it("renames a member", async () => {
    renderManager();

    await userEvent.click(within(row("영희")).getByRole("button", { name: "이름 변경" }));
    const input = screen.getByRole("textbox", { name: "새 이름" });
    await userEvent.clear(input);
    await userEvent.type(input, "영희2");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(onRename).toHaveBeenCalledWith(2, "영희2");
    expect(screen.queryByRole("textbox", { name: "새 이름" })).not.toBeInTheDocument();
  });

  it("cancels a rename", async () => {
    renderManager();

    await userEvent.click(within(row("영희")).getByRole("button", { name: "이름 변경" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(row("영희")).toBeInTheDocument();
  });

  it("deactivates an active member and reactivates an inactive one", async () => {
    renderManager([members[0], { ...members[2], active: false }]);

    expect(row("민수")).toHaveTextContent("비활성");
    await userEvent.click(within(row("철수")).getByRole("button", { name: "비활성화" }));
    await userEvent.click(within(row("민수")).getByRole("button", { name: "다시 활성화" }));

    expect(onSetActive).toHaveBeenNthCalledWith(1, 1, false);
    expect(onSetActive).toHaveBeenNthCalledWith(2, 3, true);
  });
});
