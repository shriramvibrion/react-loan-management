// cypress/e2e/2-loan-application/apply-loan.cy.js
/* Test Suite: Apply for Loan */

describe("Apply for Loan", () => {
  let testEmail;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;
    // Register and login a user
    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");
    });
  });

  it("should display apply loan button on dashboard", () => {
    cy.contains("button", /apply.*loan|new.*loan/i).should("be.visible");
  });

  it("should show loan application form", () => {
    cy.contains("button", /apply.*loan|new.*loan/i).click();

    cy.contains(/loan.*amount|how.*much/i).should("be.visible");
    cy.contains(/tenure|duration|months/i).should("be.visible");
    cy.contains(/purpose/i).should("be.visible");
    cy.contains(/name|applicant/i).should("be.visible");
    cy.contains(/pan|id/i).should("be.visible");
  });

  it("should validate required fields", () => {
    cy.contains("button", /apply.*loan|new.*loan/i).click();
    cy.contains("button", /submit|apply/i).click();

    cy.contains(/required|mandatory|please.*fill/i).should("exist");
  });

  it("should validate loan amount range", () => {
    cy.applyLoan({
      amount: -100000, // Negative amount
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/invalid|must.*be.*positive|greater.*than/i).should("be.visible");
  });

  it("should validate tenure range", () => {
    cy.applyLoan({
      tenure: 2000, // Too long
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/invalid|tenure|months|range/i).should("be.visible");
  });

  it("should validate PAN format", () => {
    cy.applyLoan({
      pan: "INVALID", // Invalid PAN
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/invalid.*pan|pan.*format/i).should("be.visible");
  });

  it("should validate Aadhaar format", () => {
    cy.applyLoan({
      aadhaar: "12345", // Too short
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/invalid.*aadhaar|aadhaar.*12.*digits/i).should("be.visible");
  });

  it("should validate CIBIL score range", () => {
    cy.applyLoan({
      cibil: 1500, // Too high
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/invalid|cibil|300.*900/i).should("be.visible");
  });

  it("should validate income amount", () => {
    cy.applyLoan({
      income: 0,
    });

    cy.contains("button", /submit|apply/i).click();
    cy.contains(/income|must.*be|greater|zero/i).should("be.visible");
  });

  it("should save draft successfully", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });

    cy.saveDraft();
    cy.contains(/draft.*saved|saved.*successfully/i).should("be.visible");
  });

  it("should allow returning to draft", () => {
    const draftAmount = "500000";

    cy.applyLoan({
      amount: draftAmount,
    });

    cy.saveDraft();
    cy.contains(/draft.*saved/i);

    // Navigate to dashboard
    cy.contains("button", /dashboard|back/i).click();

    // Return to draft
    cy.contains("button", /continue.*draft|edit.*draft/i).click();

    cy.get('input[placeholder*="amount" i]').should("have.value", draftAmount);
  });

  it("should require agreement checkbox before submit", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });

    // Try to submit without checking agreement
    cy.contains("button", /submit|apply/i).click();
    cy.contains(/accept.*terms|agree.*conditions/i).should("be.visible");
  });

  it("should submit loan application successfully", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
      cibil: 750,
    });

    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/application.*submitted|successfully.*applied/i, {
      timeout: 10000,
    }).should("be.visible");
  });

  it("should show reference number after successful submission", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
      cibil: 750,
    });

    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/reference|loan.*id|application.*id/i).should("be.visible");
  });

  it("should allow multiple loan applications", () => {
    // First loan
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });

    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/application.*submitted/i);

    // Second loan
    cy.wait(1000);
    cy.contains("button", /apply.*loan|new.*loan/i).click();

    cy.applyLoan({
      amount: 300000,
      tenure: 36,
    });

    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/application.*submitted/i);
  });

  it("should calculate EMI on the fly", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
      rate: 10,
    });

    // EMI should be calculated automatically
    cy.contains(/emi|monthly.*payment|monthly.*installment/i).should("be.visible");
  });

  it("should show success message with next steps", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
      cibil: 750,
    });

    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/submitted|success/i);
    cy.contains(/upload.*documents|next.*steps|expect/i).should("be.visible");
  });
});
