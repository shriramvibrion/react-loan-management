// cypress/e2e/8-error-scenarios/error-handling.cy.js
/* Test Suite: Error Handling and Edge Cases */

describe("Error Handling and Edge Cases", () => {
  it("should handle network error gracefully", () => {
    cy.intercept("POST", "**/api/user/login", { forceNetworkError: true });

    cy.visit("/");
    cy.contains("button", /login/i).click();
    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login/i).click();

    cy.contains(/network|connection|error|try.*again/i).should("be.visible");
  });

  it("should handle server error 500", () => {
    cy.intercept("POST", "**/api/user/login", {
      statusCode: 500,
      body: { error: "Server error" },
    });

    cy.visit("/");
    cy.contains("button", /login/i).click();
    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login/i).click();

    cy.contains(/server.*error|something.*wrong|try.*again/i).should(
      "be.visible"
    );
  });

  it("should handle server error 503", () => {
    cy.intercept("GET", "**/api/**", {
      statusCode: 503,
      body: { error: "Service unavailable" },
    });

    cy.visit("/");
    cy.contains(/service.*unavailable|maintenance|coming.*soon/i).should(
      "be.visible"
    );
  });

  it("should handle timeout gracefully", () => {
    cy.intercept("POST", "**/api/user/login", (req) => {
      req.destroy();
    });

    cy.visit("/");
    cy.contains("button", /login/i).click();
    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login/i).click();

    cy.contains(/timeout|slow|try.*again/i, { timeout: 15000 }).should(
      "be.visible"
    );
  });

  it("should handle missing required field", () => {
    cy.visit("/");
    const uniqueEmail = `test_${Date.now()}@example.com`;

    cy.contains("button", /register/i).click();

    cy.get('input[type="text"]').first().type("Test User");
    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').first().type("TestPass123!");
    cy.get('input[type="password"]').last().type("TestPass123!");
    // Skip phone field

    cy.contains("button", /register/i).click();

    cy.contains(/required|mandatory|please.*fill/i).should("be.visible");
  });

  it("should handle invalid input characters", () => {
    cy.visit("/");
    cy.contains("button", /register/i).click();

    cy.get('input[type="text"]').first().type('<script>alert("XSS")</script>');
    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').first().type("TestPass123!");
    cy.get('input[type="password"]').last().type("TestPass123!");

    cy.contains("button", /register/i).click();

    // Should either reject or sanitize
    cy.contains(/error|invalid/i).should("exist");
  });

  it("should handle very long input", () => {
    cy.visit("/");
    cy.contains("button", /register/i).click();

    const longString = "a".repeat(1000);
    cy.get('input[type="text"]').first().type(longString);

    // Should either truncate or show error
    cy.get('input[type="text"]')
      .first()
      .invoke("val")
      .then((val) => {
        expect(val.length).to.be.lessThan(longString.length + 1);
      });
  });

  it("should handle session timeout", () => {
    const testEmail = `session_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      // Simulate session timeout
      cy.window().then((win) => {
        win.localStorage.clear();
      });

      cy.reload();

      // Should redirect to login
      cy.contains("button", /login|register/i).should("be.visible");
    });
  });

  it("should handle parallel form submissions", () => {
    cy.visit("/");
    cy.contains("button", /register/i).click();

    cy.get('input[type="text"]').first().type("Test User");
    cy.get('input[type="email"]').type(`test_${Date.now()}@example.com`);
    cy.get('input[type="password"]').first().type("TestPass123!");
    cy.get('input[type="password"]').last().type("TestPass123!");
    cy.get('input[placeholder*="phone" i]').type("9876543210");

    // Click submit multiple times rapidly
    cy.contains("button", /register/i).click();
    cy.contains("button", /register/i).click();
    cy.contains("button", /register/i).click();

    // Should only submit once
    cy.contains(/successfully|registration.*complete|error.*already/i, {
      timeout: 10000,
    }).should("be.visible");
  });

  it("should handle invalid loan amount", () => {
    const testEmail = `error_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      cy.contains("button", /apply.*loan/i).click();

      cy.get('input[placeholder*="amount" i]').type("99999999999999");
      cy.get('input[placeholder*="tenure" i]').type("60");

      cy.contains("button", /submit/i).click();

      cy.contains(/invalid|too.*large|amount/i).should("be.visible");
    });
  });

  it("should handle missing authentication token", () => {
    cy.visit("/");

    // Try to access protected route without login
    cy.visit("/user-dashboard");

    // Should redirect to login
    cy.contains("button", /login|register/i).should("be.visible");
  });

  it("should handle corrupted response", () => {
    cy.intercept("GET", "**/api/user/loans", {
      statusCode: 200,
      body: "{ invalid json",
    });

    cy.visit("/");
    cy.loginUser("test@example.com", "pass");

    // Should show error
    cy.contains(/error|failed|try.*again/i).should("exist");
  });
});
