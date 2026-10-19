import { test, expect } from "@playwright/test";

test("create, search, complete and delete using the real API and database", async ({ page }) => {
  const name = `Playwright ${Date.now()}`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Plan events without the clutter." })).toBeVisible();
  await page.getByLabel("Event Name").fill(name);
  await page.getByLabel("Date", { exact: true }).fill("2026-12-05");
  await page.getByLabel("Location").fill("Lviv");
  await page.getByRole("button", { name: "Add Event" }).click();
  await page.getByPlaceholder("Search events...").fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Mark as Completed" }).click();
  await expect(row.getByText("Completed")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
});

test("edit persists after a browser reload", async ({ page }) => {
  const initialName = `Edit origin ${Date.now()}`;
  const updatedName = `Edit updated ${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Event Name").fill(initialName);
  await page.getByLabel("Date", { exact: true }).fill("2026-12-06");
  await page.getByLabel("Location").fill("Kyiv");
  await page.getByRole("button", { name: "Add Event" }).click();
  await page.getByPlaceholder("Search events...").fill(initialName);
  const row = page.getByRole("row").filter({ hasText: initialName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Event Name").fill(updatedName);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByPlaceholder("Search events...").fill(updatedName);
  await expect(page.getByRole("row").filter({ hasText: updatedName })).toBeVisible();
  await page.reload();
  await page.getByPlaceholder("Search events...").fill(updatedName);
  const updatedRow = page.getByRole("row").filter({ hasText: updatedName });
  await expect(updatedRow).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await updatedRow.getByRole("button", { name: "Delete" }).click();
  await expect(updatedRow).toHaveCount(0);
});

test("client validation stops incomplete event submissions", async ({ page }) => {
  let postCount = 0;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().includes("/api/events")) postCount += 1;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add Event" }).click();
  await expect(page.getByText("Event Name is required.")).toBeVisible();
  await expect(page.getByText("Date is required.")).toBeVisible();
  await expect(page.getByText("Location is required.")).toBeVisible();
  expect(postCount).toBe(0);
});