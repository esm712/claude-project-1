import { expect, type Page, test } from "@playwright/test";

// One shared backend DB: the tests build on each other in order.
test.describe.configure({ mode: "serial" });

const duty = (page: Page) => page.getByRole("region", { name: "오늘의 당번" });
const attendance = (page: Page) => page.getByRole("group", { name: "오늘 누가 있나요?" });
const standingRow = (page: Page, name: string) => page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: new RegExp(name) }) });

async function toggleAttendance(page: Page, name: string) {
  await attendance(page).getByText(name, { exact: true }).click();
}

async function recordPurchase(page: Page, expectedBuyer: string, cups: number) {
  await page.getByRole("button", { name: /커피 샀어요/ }).click();
  const form = page.getByRole("form", { name: "구매 기록" });
  await expect(form.getByRole("combobox", { name: "산 사람" })).toHaveValue(
    await form.getByRole("option", { name: expectedBuyer }).getAttribute("value") ?? "",
  );
  await expect(form.getByText(`(${cups}잔)`)).toBeVisible();
  await form.getByRole("button", { name: "기록하기" }).click();
  await expect(page.getByRole("status")).toHaveText(`${expectedBuyer}님이 ${cups}잔 산 것을 기록했어요.`);
}

test("set up members, rotate the duty, and handle an absent member", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/아직 등록된 멤버가 없어요/)).toBeVisible();

  for (const name of ["철수", "영희", "민수"]) {
    await page.getByRole("textbox", { name: "새 멤버 이름" }).fill(name);
    await page.getByRole("button", { name: "추가" }).click();
    await expect(page.getByRole("status")).toHaveText(`${name}님을 추가했어요.`);
  }

  // everyone buys once for all three, in duty order
  await expect(duty(page)).toContainText("철수");
  await recordPurchase(page, "철수", 3);
  await expect(standingRow(page, "철수")).toContainText("+2잔");
  await expect(duty(page)).toContainText("영희");
  await recordPurchase(page, "영희", 3);
  await expect(duty(page)).toContainText("민수");
  await recordPurchase(page, "민수", 3);
  await expect(duty(page)).toContainText("철수");

  // 민수 is away: 철수 and 영희 share a two-cup run
  await toggleAttendance(page, "민수");
  await expect(standingRow(page, "민수")).toContainText("불참");
  await expect(duty(page)).toContainText("철수");
  await recordPurchase(page, "철수", 2);
  await expect(standingRow(page, "철수")).toContainText("+1잔");
  await expect(standingRow(page, "영희")).toContainText("-1잔");
  await expect(standingRow(page, "민수")).toContainText("0잔");

  // back to full attendance: 영희 drank one more cup than they paid for
  await toggleAttendance(page, "민수");
  await expect(duty(page)).toContainText("영희");

  // everything survives a reload
  await page.reload();
  await expect(duty(page)).toContainText("영희");
  await expect(page.getByRole("listitem").filter({ hasText: "님이" })).toHaveCount(4);
});

test("deleting a mistaken record restores the previous duty", async ({ page }) => {
  await page.goto("/");
  await expect(duty(page)).toContainText("영희");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("listitem").filter({ hasText: "철수님이 2잔" }).getByRole("button", { name: "삭제" }).click();

  await expect(page.getByRole("status")).toHaveText("기록을 삭제했어요.");
  await expect(duty(page)).toContainText("철수");
  await expect(standingRow(page, "철수")).toContainText("0잔");
});

test("editing who bought moves the duty", async ({ page }) => {
  await page.goto("/");
  await expect(duty(page)).toContainText("철수");

  const latest = page.getByRole("listitem").filter({ hasText: "민수님이 3잔" });
  await latest.getByRole("button", { name: "수정" }).click();
  const form = page.getByRole("form", { name: "구매 기록" });
  await form.getByRole("combobox", { name: "산 사람" }).selectOption({ label: "영희" });
  await form.getByRole("button", { name: "수정하기" }).click();

  await expect(page.getByRole("status")).toHaveText("기록을 수정했어요.");
  await expect(standingRow(page, "영희")).toContainText("+3잔");
  await expect(standingRow(page, "민수")).toContainText("-3잔");
  await expect(duty(page)).toContainText("민수");
});

test("shows backend validation errors", async ({ page }) => {
  await page.goto("/");
  await page.getByText("멤버 관리").click();

  await page.getByRole("textbox", { name: "새 멤버 이름" }).fill("철수");
  await page.getByRole("button", { name: "추가" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText("already exists");
});

test("nobody is on duty with fewer than two people in", async ({ page }) => {
  await page.goto("/");
  await expect(duty(page)).toContainText("민수");

  await toggleAttendance(page, "철수");
  await toggleAttendance(page, "영희");

  await expect(duty(page)).toContainText("2명 이상 있어야");
});
