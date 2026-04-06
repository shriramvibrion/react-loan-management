// cypress/e2e/5-e2e-workflows/multi-user-concurrent.cy.js
/* Test Suite: Multiple Concurrent Users */

describe("Multiple Concurrent Users", () => {
  it("should handle multiple users applying for loans simultaneously", () => {
    const users = [];
    const numUsers = 3;

    // Register multiple users
    for (let i = 0; i < numUsers; i++) {
      const email = `concurrent_user_${Date.now()}_${i}@example.com`;
      users.push({
        email,
        password: "ConcurrentUser123!",
        name: `Concurrent User ${i}`,
      });

      cy.apiRegister({
        email,
        password: "ConcurrentUser123!",
        name: `Concurrent User ${i}`,
      });
    }

    // Each user applies for loan
    users.forEach((user) => {
      cy.apiApplyLoan(user.email, {
        amount: 500000 + Math.random() * 500000,
        tenure: 24 + Math.floor(Math.random() * 60),
        cibil: 600 + Math.floor(Math.random() * 200),
      });
    });

    // Verify all loans are visible in admin dashboard
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("table, div[role=list]").should("be.visible");
    // Should have at least 3 pending loans
    cy.contains("table, div[role=list]")
      .find("tr, [role='row']")
      .should("have.length.at.least", 3);
  });

  it("should handle multiple admins reviewing loans", () => {
    // Create test loan
    const userEmail = `multi_admin_test_${Date.now()}@example.com`;
    cy.apiRegister({
      email: userEmail,
      password: "TestPass123!",
    });

    cy.apiApplyLoan(userEmail, {
      amount: 500000,
      tenure: 60,
      cibil: 750,
    });

    // Admin 1 views the loan
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button, a, tr", /view|open|details/i).click();
    cy.contains(/loan.*details/i).should("be.visible");

    // Admin 1 adds a remark
    cy.contains("textarea, input[placeholder*='remark' i]").then(($textarea) => {
      if ($textarea.length > 0) {
        cy.wrap($textarea).type("Admin 1 review: Documents verified.");
        cy.contains("button", /add.*remark|save/i).click();
      }
    });

    // Admin 1 logs out
    cy.contains("button", /logout/i).click();

    // Admin 2 reviews the same loan
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button, a, tr", /view|open|details/i).click();

    // Should see Admin 1's remark
    cy.contains("Admin 1 review").should("be.visible");

    // Admin 2 adds another remark
    cy.contains("textarea, input[placeholder*='remark' i]").then(($textarea) => {
      if ($textarea.length > 0) {
        cy.wrap($textarea).type("Admin 2 review: Income verified.");
        cy.contains("button", /add.*remark|save/i).click();
      }
    });

    //Admin 2 approves
    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.contains(/approved/i).should("be.visible");
  });

  it("should prevent duplicate approvals", () => {
    // Create test loan
    const userEmail = `duplicate_approval_${Date.now()}@example.com`;
    cy.apiRegister({
      email: userEmail,
      password: "TestPass123!",
    });

    cy.apiApplyLoan(userEmail, {
      amount: 500000,
      tenure: 60,
      cibil: 750,
    });

    // Admin approves loan
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button, a, tr", /view|open|details/i).click();
    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.contains(/approved/i).should("be.visible");

    // Try to approve again - should be disabled
    cy.contains("button", /approve/i).should("not.exist");
  });
});
