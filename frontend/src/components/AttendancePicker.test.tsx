import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { members } from "@/test/fixtures";
import { AttendancePicker } from "./AttendancePicker";

describe("AttendancePicker", () => {
  it("shows a checkbox per member reflecting who is present", () => {
    render(<AttendancePicker members={members} presentIds={[1, 3]} onChange={() => {}} />);

    expect(screen.getByRole("checkbox", { name: "철수" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "영희" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "민수" })).toBeChecked();
  });

  it("removes a member who is unchecked", async () => {
    const onChange = vi.fn();
    render(<AttendancePicker members={members} presentIds={[1, 2, 3]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "민수" }));

    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it("adds a member back in member order", async () => {
    const onChange = vi.fn();
    render(<AttendancePicker members={members} presentIds={[3, 2]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "철수" }));

    expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
  });
});
