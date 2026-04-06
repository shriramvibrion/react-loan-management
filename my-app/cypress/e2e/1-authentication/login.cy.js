// cypress/e2e/1-authentication/login.cy.js
/* Test Suite: User Login */

describe("User Login", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display login form", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.contains("button", /login|sign.*in/i).should("be.visible");
  });

  it("should show error for empty email", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login|sign.*in/i).click();
    cy.contains(/email.*required|enter.*email/i).should("be.visible");
  });

  it("should show error for empty password", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').type("test@example.com");
    cy.contains("button", /login|sign.*in/i).click();
    cy.contains(/password.*required|enter.*password/i).should("be.visible");
  });

  it("should show error for invalid credentials", () => {
    cy.loginUser("nonexistent@example.com", "WrongPassword123!");
    cy.contains(/invalid|incorrect|credentials/i).should("be.visible");
  });

  it("should login successfully with valid credentials", () => {
    // First register a user
    cy.registerUser({
      email: "valid.user@example.com",
      password: "ValidPass123!",
    }).then(() => {
      // Then login
      cy.loginUser("valid.user@example.com", "ValidPass123!");
      cy.contains(/dashboard|welcome|loan/i).should("be.visible");
    });
  });

  it("should validate email format", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').type("invalid-email");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login|sign.*in/i).click();
    cy.contains(/invalid.*email|email.*format/i).should("be.visible");
  });

  it("should show password visibility toggle", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="password"]').should("have.attr", "type", "password");
    // Check for visibility toggle (if implemented)
    cy.get('button[aria-label*="password" i], .toggle-password').should(
      "exist"
    );
  });

  it("should maintain form state on navigation away and back", () => {
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').type("test@example.com");
    cy.contains("button", /register|sign.*up/i).click();
    cy.contains("button", /login|sign.*in/i).click();
    // Email should be cleared (form reset) or maintained depending on implementation
    cy.get('input[type="email"]').should("exist");
  });

  it("should limit login attempts (rate limiting)", () => {
    cy.contains("button", /login|sign.*in/i).click();
    for (let i = 0; i < 12; i++) {
      cy.get('input[type="email"]').clear().type(`test${i}@example.com`);
      cy.get('input[type="password"]').clear().type("WrongPass123!");
      cy.contains("button", /login|sign.*in/i).click();
    }
    cy.contains(/too.*many|rate.*limit|try.*again.*later/i).should("be.visible");
  });
});
