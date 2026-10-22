import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { errorMessage, formatBalance, formatDate, todayIso } from "./format";

describe("formatBalance", () => {
  it.each([
    [2, "+2잔"],
    [0, "0잔"],
    [-1, "-1잔"],
  ])("%i -> %s", (balance, expected) => {
    expect(formatBalance(balance)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("shows month, day and weekday in Korean", () => {
    expect(formatDate("2026-10-22")).toBe("10월 22일 (목)");
    expect(formatDate("2026-11-01")).toBe("11월 1일 (일)");
  });
});

describe("errorMessage", () => {
  it("includes the backend detail for API errors", () => {
    expect(errorMessage(new ApiError(400, "member 9 is inactive"))).toContain("member 9 is inactive");
  });

  it("explains connection problems", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toContain("서버에 연결하지 못했어요");
  });
});

describe("todayIso", () => {
  it("uses the local calendar date, zero-padded", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 9, 22, 0, 1))).toBe("2026-10-22");
  });
});
