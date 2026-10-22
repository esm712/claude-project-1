import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { standing } from "@/test/fixtures";
import { StandingsTable } from "./StandingsTable";

const standings = [
  standing(1, { balance: 1, cupsGiven: 2, cupsReceived: 1, purchaseCount: 1, lastPurchasedAt: "2026-10-20" }),
  standing(2, { balance: -1, cupsReceived: 1 }),
  standing(3),
];

function row(name: string) {
  return screen.getByRole("rowheader", { name: new RegExp(name) }).closest("tr")!;
}

describe("StandingsTable", () => {
  it("shows balance, cups given and received, and last purchase", () => {
    render(<StandingsTable standings={standings} presentIds={[1, 2, 3]} nextDutyId={2} />);

    const cells = within(row("철수")).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["+1잔", "2", "1", "10월 20일 (화)"]);
    expect(within(row("민수")).getAllByRole("cell").at(-1)).toHaveTextContent("-");
  });

  it("marks who is on duty and who is absent", () => {
    render(<StandingsTable standings={standings} presentIds={[1, 2]} nextDutyId={2} />);

    expect(row("영희")).toHaveTextContent("당번");
    expect(row("철수")).not.toHaveTextContent("당번");
    expect(row("민수")).toHaveTextContent("불참");
    expect(row("철수")).not.toHaveTextContent("불참");
  });

  it("hides inactive members", () => {
    render(
      <StandingsTable standings={[...standings, { ...standing(3), memberId: 4, name: "퇴사자", active: false }]} presentIds={[1, 2, 3]} nextDutyId={2} />,
    );

    expect(screen.queryByText("퇴사자")).not.toBeInTheDocument();
  });
});
