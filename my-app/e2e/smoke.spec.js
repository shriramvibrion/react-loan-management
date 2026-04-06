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

  test("feature: apply loan form contains CIBIL score field", async ({ page }) => {
    await page.route("**/api/user/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Login successful.",
          user: { email: "user@test.com", name: "Test User" },
        }),
      });
    });

    await page.route("**/api/user/loans**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ loans: [] }),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "User" }).click();
    await page.getByPlaceholder("Email").fill("user@test.com");
    await page.getByPlaceholder("Password").fill("secret");
    await page.getByRole("button", { name: "Login" }).click();

    // Navigate to apply loan page
    await page.getByRole("button", { name: /apply/i }).click();

    await expect(page.getByPlaceholder(/cibil/i)).toBeVisible();
  });

  test("feature: admin dashboard shows NEW badge for unviewed pending loans", async ({ page }) => {
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
              loan_id: 202,
              user_id: 11,
              user_name: "Bob",
              user_email: "bob@test.com",
              status: "Pending",
              applied_date: "2026-03-10T09:00:00",
              viewed_by_admin: false,
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

    await expect(page.getByText("NEW")).toBeVisible();
  });

