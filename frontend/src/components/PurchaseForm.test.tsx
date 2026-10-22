import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { members } from "@/test/fixtures";
import { PurchaseForm, type PurchaseFormValues } from "./PurchaseForm";

const TODAY = "2026-10-22";

function renderForm(initial: Partial<PurchaseFormValues> = {}, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn();
  render(
    <PurchaseForm
      members={members}
      initial={{ buyerId: 3, participantIds: [1, 2, 3], purchasedAt: TODAY, memo: "", ...initial }}
      today={TODAY}
      submitLabel="기록하기"
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
}

const submit = () => screen.getByRole("button", { name: "기록하기" });
const participant = (name: string) => screen.getByRole("checkbox", { name });

describe("PurchaseForm", () => {
  it("starts from the given buyer, participants and date", () => {
    renderForm({ buyerId: 3, participantIds: [1, 3] });

    expect(screen.getByRole("combobox", { name: "산 사람" })).toHaveDisplayValue("민수");
    expect(participant("철수")).toBeChecked();
    expect(participant("영희")).not.toBeChecked();
    expect(screen.getByLabelText("날짜")).toHaveValue(TODAY);
    expect(screen.getByText(/2잔/)).toBeInTheDocument();
  });

  it("submits buyer, participants including the buyer, date and trimmed memo", async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText("메모 (선택)"), "  아아 3  ");
    await userEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledWith({ buyerId: 3, participantIds: [1, 2, 3], purchasedAt: TODAY, memo: "아아 3" });
  });

  it("leaves the memo out when it is blank", async () => {
    const { onSubmit } = renderForm();
    await userEvent.click(submit());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("memo");
  });

  it("keeps the buyer checked and locked as a participant", async () => {
    const { onSubmit } = renderForm({ participantIds: [1, 3] });

    expect(participant("민수")).toBeChecked();
    expect(participant("민수")).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "산 사람" }), "영희");

    expect(participant("영희")).toBeChecked();
    expect(participant("영희")).toBeDisabled();
    expect(participant("민수")).toBeEnabled();
    // the previous buyer still drank
    expect(participant("민수")).toBeChecked();
    await userEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 2, participantIds: [1, 2, 3] }));
  });

  it("keeps everyone who drank when the buyer is switched to another drinker", async () => {
    const { onSubmit } = renderForm({ buyerId: 1, participantIds: [1, 2] });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "산 사람" }), "영희");
    await userEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 2, participantIds: [1, 2] }));
  });

  it("lets the previous buyer be unchecked after switching", async () => {
    const { onSubmit } = renderForm({ buyerId: 3, participantIds: [1, 2, 3] });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "산 사람" }), "영희");
    await userEvent.click(participant("민수"));
    await userEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 2, participantIds: [1, 2] }));
  });

  it("records a two-cup run when someone is away", async () => {
    const { onSubmit } = renderForm({ buyerId: 1, participantIds: [1, 2] });

    await userEvent.click(submit());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 1, participantIds: [1, 2] }));
  });

  it("blocks a purchase with only the buyer", async () => {
    const { onSubmit } = renderForm({ buyerId: 1, participantIds: [1, 2] });

    await userEvent.click(participant("영희"));

    expect(screen.getByText(/함께 마신 사람을 한 명 이상/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks future dates", async () => {
    renderForm();

    const date = screen.getByLabelText("날짜");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-10-23");

    expect(screen.getByText("미래 날짜는 기록할 수 없어요.")).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("allows past dates", async () => {
    const { onSubmit } = renderForm({ purchasedAt: "2026-10-01" });
    await userEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ purchasedAt: "2026-10-01" }));
  });

  it("shows the backend error and lets the user retry", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new ApiError(400, "member 3 is inactive")).mockResolvedValue(undefined);
    renderForm({}, onSubmit);

    await userEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent("member 3 is inactive");
    expect(submit()).toBeEnabled();
    await userEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("prevents double submission while saving", async () => {
    const onSubmit = vi.fn(() => new Promise<void>(() => {}));
    renderForm({}, onSubmit);

    await userEvent.click(submit());
    await userEvent.click(screen.getByRole("button", { name: "저장 중…" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("cancels", async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
