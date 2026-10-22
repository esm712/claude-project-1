import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { duty, standing } from "@/test/fixtures";
import { DutyCard } from "./DutyCard";

describe("DutyCard", () => {
  it("names the member on duty with their balance", () => {
    render(<DutyCard duty={duty(2, [1, 2, 3], [standing(1, { balance: 1 }), standing(2, { balance: -1 }), standing(3)])} />);

    const card = screen.getByRole("region", { name: "오늘의 당번" });
    expect(card).toHaveTextContent("영희");
    expect(card).toHaveTextContent("잔액 -1잔");
  });

  it("explains when nobody needs to buy", () => {
    render(<DutyCard duty={duty(null, [1])} />);

    expect(screen.getByRole("region", { name: "오늘의 당번" })).toHaveTextContent("2명 이상 있어야");
  });
});
