import { ApiError } from "./api";

/** "+2잔", "-1잔", "0잔" */
export function formatBalance(balance: number): string {
  return `${balance > 0 ? "+" : ""}${balance}잔`;
}

/** "2026-10-22" -> "10월 22일 (목)" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `요청을 처리하지 못했어요: ${error.message}`;
  }
  return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
