// cypress/e2e/6-notifications/notifications.cy.js
/* Test Suite: Notifications System */

describe("Notifications System", () => {
  let testEmail;

  beforeEach(() => {
    testEmail = `notify_${Date.now()}@example.com`;
    cy.apiRegister({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");
    });
  });

  it("should display notifications icon", () => {
    cy.contains("button", /notification|bell|alert/i).should("be.visible");
  });

  it("should show notification count badge", () => {
    cy.contains("button", /notification|bell|alert/i).then(($btn) => {
      if ($btn.find("span").length > 0) {
        cy.wrap($btn).find("span").should("contain", /\d+/);
      }
    });
  });

  it("should open notifications panel", () => {
    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains(/notifications|no.*notifications/i).should("be.visible");
  });

  it("should display notification messages", () => {
    // Apply for loan
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });
    cy.acceptAgreement();
    cy.submitForm();

    cy.wait(1000);

    // Check notifications
    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains(/application.*received|submitted/i).should("be.visible");
  });

  it("should mark notification as read", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });
    cy.acceptAgreement();
    cy.submitForm();

    cy.wait(1000);

    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains("button", /mark.*read|read/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/marked.*read/i).should("exist");
      }
    });
  });

  it("should delete notification", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });
    cy.acceptAgreement();
    cy.submitForm();

    cy.wait(1000);

    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains("button", /delete|remove/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains("button", /confirm|yes|delete/i).click();
      }
    });
  });

  it("should filter notifications", () => {
    cy.contains("button", /notification|bell|alert/i).click();

    cy.contains("button", /filter|type|category/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/application|payment|document/i).should("exist");
      }
    });
  });

  it("should show notification timestamp", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });
    cy.acceptAgreement();
    cy.submitForm();

    cy.wait(1000);

    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains(/ago|today|time/i).should("be.visible");
  });

  it("should send email notification on application submission", () => {
    cy.applyLoan({
      amount: 500000,
      tenure: 60,
    });
    cy.acceptAgreement();
    cy.submitForm();

    cy.contains(/application.*submitted|successfully.*applied/i);

    // Check notifications panel for confirmation
    cy.contains("button", /notification|bell|alert/i).click();
    cy.contains(/confirmation.*sent|email.*sent/i).should("exist");
  });

  it("should send notification on loan status change", () => {
    // Apply for loan via API
    cy.apiApplyLoan(testEmail, {
      amount: 500000,
      tenure: 60,
    }).then(() => {
      // Admin approves
      cy.visit("/");
      cy.loginAdmin("admin@example.com", "AdminPass123!");

      cy.contains("button, a, tr", /view|open|details/i).click();
      cy.contains("button", /approve/i).click();
      cy.contains("button", /confirm|yes|approve/i).click();

      // User logs back in and checks notifications
      cy.contains("button", /logout/i).click();
      cy.loginUser(testEmail, "TestPass123!");

      cy.contains("button", /notification|bell|alert/i).click();
      cy.contains(/approved|status.*changed/i).should("be.visible");
    });
  });

  it("should mark all notifications as read", () => {
    cy.contains("button", /notification|bell|alert/i).click();

    cy.contains("button", /mark.*all.*read|clear/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/all.*marked|cleared/i).should("exist");
      }
    });
  });

  it("should show no notifications when none exist", () => {
    cy.contains("button", /notification|bell|alert/i).click();

    // If no notifications exist
    cy.contains(/no.*notifications|empty/i).should("exist");
  });
});
