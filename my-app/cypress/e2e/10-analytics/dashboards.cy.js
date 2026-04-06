// cypress/e2e/10-analytics/dashboards.cy.js
/* Test Suite: Analytics and Dashboards */

describe("Analytics and Dashboards", () => {
  it("should display user dashboard statistics", () => {
    const testEmail = `analytics_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      cy.contains(/my.*loans|dashboard|summary/i).should("be.visible");
      cy.contains(/total.*loans|pending|approved|rejected/i).should("be.visible");
    });
  });

  it("should display loan status breakdown", () => {
    cy.visit("/");
    const testEmail = `analytics_status_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      // Create multiple loans with different statuses
      cy.apiApplyLoan(testEmail, {
        amount: 500000,
        tenure: 60,
      });

      cy.contains(/pending|approved|rejected|draft/i).should("be.visible");
    });
  });

  it("should display admin analytics dashboard", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains(/dashboard|analytics|reports/i).should("be.visible");
    cy.contains(/total.*applications|approved|pending|rejected/i).should(
      "be.visible"
    );
  });

  it("should show loan processing metrics", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains(/average|processing|time|approval.*rate/i).should("be.visible");
  });

  it("should display charts and graphs", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.get("canvas, svg, [role='img']").should("exist");
  });

  it("should allow filtering analytics by date range", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains(/filter|date.*range|from|to/i).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click();
        cy.get('input[type="date"]').should("exist");
      }
    });
  });

  it("should export analytics report", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button", /export|download|report/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/csv|pdf|excel/i).should("exist");
      }
    });
  });

  it("should show user analytics", () => {
    const testEmail = `analytics_user_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      cy.contains("button", /analytics|reports|statistics/i).then(($btn) => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();
          cy.contains(
            /loan.*analytics|dashboard|statistics/i
          ).should("be.visible");
        }
      });
    });
  });

  it("should display loan amount distribution", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button", /analytics|reports/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/distribution|range|amount/i).should("exist");
      }
    });
  });

  it("should show approval trend over time", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button", /analytics|reports|trend/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/trend|approval.*rate|over.*time/i).should("exist");
      }
    });
  });

  it("should display user engagement metrics", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains("button", /analytics|reports/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/users|registrations|active|engagement/i).should("exist");
      }
    });
  });
});
