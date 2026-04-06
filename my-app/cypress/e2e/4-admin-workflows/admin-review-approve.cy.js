// cypress/e2e/4-admin-workflows/admin-review-approve.cy.js
/* Test Suite: Admin Review and Approve/Reject Loans */

describe("Admin Review and Loan Approval", () => {
  let testEmail;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;

    // Create a user with a loan application
    cy.apiRegister({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.apiApplyLoan(testEmail, {
        amount: 500000,
        tenure: 60,
        cibil: 750,
      }).then(() => {
        // Login as admin
        cy.visit("/");
        cy.loginAdmin("admin@example.com", "AdminPass123!");
      });
    });
  });

  it("should display pending application", () => {
    cy.contains("table, div[role=list]").should("be.visible");
    cy.contains(/pending/i).should("be.visible");
  });

  it("should allow viewing application details", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();
    cy.contains(/loan.*details|application|amount|status/i).should("be.visible");
  });

  it("should show applicant information", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains(/name|applicant/i).should("be.visible");
    cy.contains(/email/i).should("be.visible");
    cy.contains(/phone|mobile/i).should("be.visible");
    cy.contains(/pan|aadhaar|id/i).should("be.visible");
  });

  it("should show financial information", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains(/monthly.*income|income/i).should("be.visible");
    cy.contains(/cibil|credit.*score/i).should("be.visible");
    cy.contains(/employment|employment.*type/i).should("be.visible");
  });

  it("should show uploaded documents", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains(/documents|attached.*documents/i).should("be.visible");
  });

  it("should allow adding remarks to application", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("textarea, input[placeholder*='remark' i]").then(($textarea) => {
      if ($textarea.length > 0) {
        cy.wrap($textarea).type("Application looks good. Income verified.");
        cy.contains("button", /add.*remark|comment|save/i).click();
        cy.contains(/saved|added|successfully/i).should("be.visible");
      }
    });
  });

  it("should display existing remarks", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains(/remarks|comments|admin.*notes/i).should("be.visible");
  });

  it("should allow approving application", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /approve/i).click();

    // Confirmation dialog
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.contains(/approved|successfully.*approved/i).should("be.visible");
  });

  it("should allow rejecting application", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /reject/i).click();

    // Should ask for reason
    cy.contains(/reason|comment|message/i).should("be.visible");
    cy.get("textarea, input").last().type("CIBIL score too low");
    cy.contains("button", /confirm|yes|reject/i).click();

    cy.contains(/rejected|successfully.*rejected/i).should("be.visible");
  });

  it("should update loan status after approval", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.wait(1000);
    cy.contains(/approved/i).should("be.visible");
  });

  it("should send notification to user after approval", () => {
    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    // Check that notification section shows action taken
    cy.contains(/notification.*sent|user.*notified/i).should("exist");
  });

  it("should show audit trail", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains(/history|audit|timeline|action.*log/i).should("be.visible");
  });

  it("should allow requesting additional documents", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /request.*document|ask.*for.*document/i).then(
      ($btn) => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();
          cy.get('select, input[placeholder*="document" i]').then(($select) => {
            if ($select.length > 0) {
              cy.wrap($select).select("Bank Statement");
              cy.contains("button", /send|request/i).click();
              cy.contains(/requested|sent.*successfully/i).should("be.visible");
            }
          });
        }
      }
    );
  });

  it("should not allow approving/rejecting twice", () => {
    cy.contains("button, a, tr", /view|open|details/i).click();

    cy.contains("button", /approve/i).click();
    cy.contains("button", /confirm|yes|approve/i).click();

    cy.wait(1000);

    // Approve button should be disabled or hidden
    cy.contains("button", /approve/i).should("not.exist");
  });
});
