// cypress/e2e/1-authentication/admin-login.cy.js
/* Test Suite: Admin Login */

describe("Admin Login", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display admin login option", () => {
    cy.contains("button", /admin/i).should("be.visible");
  });

  it("should show admin login form", () => {
    cy.contains("button", /admin/i).click();
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
  });

  it("should reject invalid admin credentials", () => {
    cy.loginAdmin("admin@example.com", "WrongPass123!");
    cy.contains(/invalid|incorrect|credentials/i).should("be.visible");
  });

  it("should login successfully with valid admin credentials", () => {
    // Note: This requires a pre-created admin account
    // You may need to create one via API first
    cy.loginAdmin("admin@example.com", "AdminPass123!");
    cy.contains(/admin.*dashboard|welcome/i).should("be.visible");
  });

  it("should show rate limiting after multiple failed attempts", () => {
    cy.contains("button", /admin/i).click();
    cy.contains("button", /login|sign.*in/i).click();

    for (let i = 0; i < 12; i++) {
      cy.get('input[type="email"]').clear().type(`admin${i}@example.com`);
      cy.get('input[type="password"]').clear().type("WrongPassword!");
      cy.contains("button", /login|sign.*in/i).click();
    }

    cy.contains(/too.*many|rate.*limit|try.*again.*later/i).should("be.visible");
  });

  it("should have different admin dashboard from user dashboard", () => {
    cy.loginAdmin("admin@example.com", "AdminPass123!");
    cy.contains(/admin.*dashboard|all.*loans|view.*users/i).should("be.visible");
    // Admin dashboard should not show "apply loan" button
    cy.contains("button", /apply.*loan/i).should("not.exist");
  });
});
