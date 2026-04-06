// cypress/e2e/4-admin-workflows/admin-dashboard.cy.js
/* Test Suite: Admin Dashboard */

describe("Admin Dashboard", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");
  });

  it("should display admin dashboard", () => {
    cy.contains(/admin.*dashboard|dashboard/i).should("be.visible");
  });

  it("should show pending loans list", () => {
    cy.contains(/pending|applications|loans.*requiring.*action/i).should(
      "be.visible"
    );
  });

  it("should display loan count statistics", () => {
    cy.contains(/total.*loans|pending|approved|rejected/i).should("be.visible");
  });

  it("should allow filtering loans by status", () => {
    cy.get('select, input[placeholder*="status" i]').first().then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).select("Pending");
        cy.contains(/pending.*loans/i).should("be.visible");

        cy.wrap($el).select("Approved");
        cy.contains(/approved.*loans/i).should("be.visible");
      }
    });
  });

  it("should display loan processing metrics", () => {
    cy.contains(/average.*processing|loans.*processed|approval.*rate/i).should(
      "be.visible"
    );
  });

  it("should show admin notifications", () => {
    cy.contains(/notifications|alerts|updates/i).should("be.visible");
  });

  it("should allow accessing loan details from dashboard", () => {
    cy.contains("button, a, tr", /view|open|loan.*details/i).click();
    cy.contains(/loan.*details|application|status/i).should("be.visible");
  });

  it("should display actionable loan list", () => {
    cy.contains("table, div[role=list]").should("be.visible");
    cy.contains(/loan.*amount|applicant|date|status/i).should("be.visible");
  });

  it("should show search functionality", () => {
    cy.get('input[placeholder*="search" i], input[placeholder*="application" i]')
      .first()
      .should("be.visible");
  });

  it("should allow sorting loans", () => {
    cy.contains(/sort|order/i).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click();
        cy.contains(/recent|oldest|amount/i).should("exist");
      }
    });
  });

  it("should show pagination for large datasets", () => {
    cy.get("table, div[role=list]").then(($list) => {
      if ($list.find("tr").length > 10) {
        cy.contains(/previous|next|page/i).should("be.visible");
      }
    });
  });

  it("should display quick actions", () => {
    cy.contains("button", /approve|reject|review|comment/i).should("exist");
  });
});
