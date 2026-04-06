// cypress/e2e/1-authentication/registration.cy.js
/* Test Suite: User Registration */

describe("User Registration", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.contains("button", /register|sign.*up/i).click();
  });

  it("should display registration form with all fields", () => {
    cy.get('input[type="text"]').should("be.visible"); // name
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("have.length.at.least", 2);
    cy.contains(/phone|mobile/i).should("be.visible");
    cy.contains(/city/i).should("be.visible");
  });

  it("should show error for empty fields", () => {
    cy.contains("button", /register|sign.*up/i).click();
    cy.contains(/name.*required|enter.*name/i).should("be.visible");
  });

  it("should validate password strength", () => {
    cy.registerUser({
      password: "weak",
    });
    cy.contains(
      /password.*strong|uppercase|lowercase|digit|special|at.*least/i
    ).should("be.visible");
  });

  it("should require password confirmation", () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    cy.get('input[type="text"]').first().type("Test User");
    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').first().type("ValidPass123!");
    cy.get('input[type="password"]').last().type("DifferentPass123!");
    cy.contains("button", /register|sign.*up/i).click();
    cy.contains(/match|confirm.*password/i).should("be.visible");
  });

  it("should reject duplicate email", () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;

    // First registration
    cy.registerUser({
      email: uniqueEmail,
    });

    // Wait for success message, then redirect back to register
    cy.contains(/successfully|registration.*complete/i, { timeout: 10000 });
    cy.visit("/");
    cy.contains("button", /register|sign.*up/i).click();

    // Try to register with same email
    cy.registerUser({
      email: uniqueEmail,
    });

    cy.contains(/already.*registered|duplicate|email.*exists/i).should(
      "be.visible"
    );
  });

  it("should validate email format", () => {
    cy.get('input[type="text"]').first().type("Test User");
    cy.get('input[type="email"]').type("invalid-email");
    cy.get('input[type="password"]').first().type("ValidPass123!");
    cy.get('input[type="password"]').last().type("ValidPass123!");
    cy.contains("button", /register|sign.*up/i).click();
    cy.contains(/invalid.*email|email.*format/i).should("be.visible");
  });

  it("should validate phone format", () => {
    cy.registerUser({
      phone: "12345", // Too short
    });
    cy.contains(/phone|mobile|10.*digits/i).should("be.visible");
  });

  it("should register successfully with valid data", () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    cy.registerUser({
      name: "Test User",
      email: uniqueEmail,
      password: "ValidPass123!",
      phone: "9876543210",
      city: "Mumbai",
    });

    cy.contains(/successfully|registration.*complete/i, { timeout: 10000 }).should(
      "be.visible"
    );
  });

  it("should allow login after successful registration", () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const password = "ValidPass123!";

    cy.registerUser({
      email: uniqueEmail,
      password: password,
    });

    cy.contains(/successfully|registration.*complete/i);

    // Navigate to login
    cy.visit("/");
    cy.contains("button", /login|sign.*in/i).click();

    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').type(password);
    cy.contains("button", /login|sign.*in/i).click();

    cy.contains(/dashboard|welcome/i, { timeout: 10000 }).should("be.visible");
  });

  it("should show password strength indicator", () => {
    cy.get('input[type="password"]').first().click();
    cy.contains(/strength|indicator|weak|strong/i).should("exist");

    cy.get('input[type="password"]').first().type("Weak");
    cy.contains(/weak/i).should("be.visible");

    cy.get('input[type="password"]').first().clear().type("StrongPass123!");
    cy.contains(/strong|good/i).should("be.visible");
  });

  it("should clear form when clicking cancel/reset", () => {
    cy.get('input[type="text"]').first().type("Test User");
    cy.get('input[type="email"]').type("test@example.com");

    // Look for cancel/reset button
    cy.contains("button", /cancel|reset|clear/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.get('input[type="email"]').should("have.value", "");
      }
    });
  });
});
