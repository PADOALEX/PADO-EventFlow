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
