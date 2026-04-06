// cypress/e2e/2-loan-application/loan-details.cy.js
/* Test Suite: View and Manage Loan Details */

describe("Loan Details and Management", () => {
  let testEmail;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;
    // Register, login, and apply for a loan
    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");
      cy.applyLoan({
        amount: 500000,
        tenure: 60,
        cibil: 750,
      });
      cy.acceptAgreement();
      cy.submitForm();
    });
  });

  it("should display loan in user dashboard", () => {
    cy.visit("/");
    cy.loginUser(testEmail, "TestPass123!");
    cy.contains(/my.*loans|active.*loans/i).should("be.visible");
  });

  it("should show loan list with key details", () => {
    cy.contains("table, div[role=list]").should("be.visible");
    cy.contains(/loan.*amount|status|date.*applied|tenure/i).should("be.visible");
  });

  it("should allow clicking on loan to view details", () => {
    cy.wait(1000);
    cy.contains("button, a, tr", /view|details|loan/i).click();
    cy.contains(/loan.*details|application.*details/i).should("be.visible");
  });

  it("should display full loan details page", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/loan.*amount|applied.*amount/i).should("be.visible");
    cy.contains(/status/i).should("be.visible");
    cy.contains(/tenure|duration/i).should("be.visible");
    cy.contains(/purpose/i).should("be.visible");
    cy.contains(/emi|monthly.*payment/i).should("be.visible");
  });

  it("should show applicant details", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/applicant|name/i).should("be.visible");
    cy.contains(/email|contact/i).should("be.visible");
    cy.contains(/phone|mobile/i).should("be.visible");
  });

  it("should show financial details", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/cibil|score/i).should("be.visible");
    cy.contains(/monthly.*income|income/i).should("be.visible");
    cy.contains(/employment|employment.*type/i).should("be.visible");
  });

  it("should show loan status timeline", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/timeline|status.*history|application.*status/i).should("be.visible");
  });

  it("should allow updating contact information", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains("button", /edit|update.*contact|modify/i).click();

    cy.get('input[type="email"]').clear().type("newemail@example.com");
    cy.get('input[placeholder*="phone" i]').clear().type("9876543211");

    cy.contains("button", /save|update/i).click();

    cy.contains(/updated|saved|successfully/i).should("be.visible");
  });

  it("should show document upload section", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(
      /documents|upload.*documents|required.*documents/i
    ).should("be.visible");
  });

  it("should show EMI calculation details", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/emi.*amount|monthly.*payment/i).should("be.visible");
    cy.contains(/rate.*of.*interest|interest.*rate/i).should("be.visible");
  });

  it("should show loan summary", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/summary|overview/i).should("be.visible");
  });

  it("should allow downloading loan details as PDF", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains("button", /download|pdf|print/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        // Verify file download started
        cy.readFile("cypress/downloads/loan_details.pdf", {
          timeout: 10000,
        }).should("exist");
      }
    });
  });

  it("should show loan remarks section", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/remarks|comments|admin.*notes/i).should("be.visible");
  });

  it("should display loan status badge", () => {
    cy.contains("button, a, tr", /view|details|loan/i).click();

    cy.contains(/pending|approved|rejected|under.*review/i).should("be.visible");
  });
});
