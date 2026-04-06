// cypress/e2e/5-e2e-workflows/complete-loan-journey.cy.js
/* Test Suite: Complete Loan Journey from Registration to Approval */

describe("Complete Loan Journey - End to End", () => {
  it("should complete full user and loan workflow", () => {
    const uniqueEmail = `e2e_${Date.now()}@example.com`;
    const password = "StrongPass123!";

    // Step 1: Register new user
    cy.visit("/");
    cy.contains("button", /register|sign.*up/i).click();

    const userName = "E2E Test User";
    cy.get('input[type="text"]').first().type(userName);
    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').first().type(password);
    cy.get('input[type="password"]').last().type(password);
    cy.get('input[placeholder*="phone" i]').type("9876543210");
    cy.get('input[placeholder*="city" i]').type("Mumbai");

    cy.contains("button", /register|sign.*up/i).click();
    cy.contains(/successfully|registration.*complete/i, { timeout: 10000 }).should(
      "be.visible"
    );

    // Step 2: Login with new account
    cy.visit("/");
    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').type(password);
    cy.contains("button", /login|sign.*in/i).click();

    cy.contains(/dashboard|welcome/i, { timeout: 10000 }).should("be.visible");

    // Step 3: Check eligibility (if available)
    cy.contains("button", /eligibility|check|calculator/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/eligible|not.*eligible|approved.*amount/i).should("be.visible");
      }
    });

    // Step 4: Apply for loan
    cy.contains("button", /apply.*loan|new.*loan/i).click();

    cy.get('input[placeholder*="amount" i]').type("500000");
    cy.get('input[placeholder*="tenure" i]').type("60");

    cy.get('select, input[placeholder*="purpose" i]')
      .first()
      .then(($el) => {
        if ($el.is("select")) {
          cy.wrap($el).select("Home Loan");
        } else {
          cy.wrap($el).type("Home Loan");
        }
      });

    cy.get('input[placeholder*="full.*name" i]').type(userName);
    cy.get('input[placeholder*="pan" i]').type("ABCDE1234F");
    cy.get('input[placeholder*="aadhaar" i]').type("123456789012");
    cy.get('input[placeholder*="income" i]').type("50000");
    cy.get('input[placeholder*="cibil" i]').type("750");

    cy.get('select, input[placeholder*="employment" i]')
      .last()
      .then(($el) => {
        if ($el.is("select")) {
          cy.wrap($el).select("Salaried");
        } else {
          cy.wrap($el).type("Salaried");
        }
      });

    // Step 5: Review and accept terms
    cy.contains(/terms|conditions|agreement/i).should("be.visible");
    cy.get('input[type="checkbox"]').check({ force: true });

    // Step 6: Submit loan application
    cy.contains("button", /submit|apply/i).click();
    cy.contains(/application.*submitted|successfully.*applied/i, {
      timeout: 10000,
    }).should("be.visible");

    // Step 7: View loan in dashboard
    cy.wait(1000);
    cy.contains("button", /dashboard|back|my.*loans/i).click();

    cy.contains(/my.*loans|active.*loans/i).should("be.visible");
    cy.contains(/pending|under.*review/i).should("be.visible");

    // Step 8: View loan details
    cy.contains("button, a, tr", /view|details|loan/i).click();
    cy.contains(/loan.*details|500000|status/i).should("be.visible");

    // Step 9: Upload documents
    cy.contains(/documents|upload/i).click();
    cy.contains("button", /upload|add.*document/i).click();

    // Step 10: Check notifications
    cy.contains("button", /notification|message|alert/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/application.*received|submission/i).should("exist");
      }
    });

    // Step 11: Logout
    cy.contains("button", /logout|sign.*out|profile/i).click();
    cy.contains("button", /logout|sign.*out/i).click();
    cy.contains(/login|register/i).should("be.visible");

    // Step 12: Admin approval flow
    cy.contains("button", /admin/i).click();
    cy.contains("button", /login|sign.*in/i).click();

    cy.get('input[type="email"]').type("admin@example.com");
    cy.get('input[type="password"]').type("AdminPass123!");
    cy.contains("button", /login|sign.*in/i).click();

    cy.contains(/admin.*dashboard/i, { timeout: 10000 }).should("be.visible");

    // Step 13: Find and approve the loan
    cy.contains("table, div[role=list]").should("be.visible");
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.contains(/approved|successfully.*approved/i).should("be.visible");

    // Step 14: User receives approval notification
    cy.contains("button", /logout|sign.*out/i).click();
    cy.contains("button", /yes|confirm|logout/i).click();

    cy.contains("button", /login|sign.*in/i).click();
    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="password"]').type(password);
    cy.contains("button", /login|sign.*in/i).click();

    cy.contains(/dashboard|notification|approved/i, { timeout: 10000 }).should(
      "be.visible"
    );
  });
});
