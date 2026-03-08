const { test, expect } = require("@playwright/test");

test("smoke: index page renders user/admin entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "User" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
});

test("feature: user login redirects to documentation", async ({ page }) => {
  await page.route("**/api/user/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Login successful.",
        user: { email: "user@test.com" },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "User" }).click();
  await page.getByPlaceholder("Email").fill("user@test.com");
  await page.getByPlaceholder("Password").fill("secret");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Loan Documentation Centre")).toBeVisible();
});

test("regression: admin dashboard loads and displays loan cards", async ({ page }) => {
  await page.route("**/api/admin/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Login successful.", admin: "admin@test.com" }),
    });
  });

  await page.route("**/api/admin/loans", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        loans: [
          {
            loan_id: 101,
            user_id: 10,
            user_name: "Alice",
            user_email: "alice@test.com",
            status: "Pending",
            applied_date: "2026-03-01T10:00:00",
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByPlaceholder("Email").fill("admin@test.com");
  await page.getByPlaceholder("Password").fill("secret");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Loan Applications")).toBeVisible();
  await expect(page.getByText("Loan #1")).toBeVisible();
  await expect(page.getByText("alice@test.com")).toBeVisible();
});

