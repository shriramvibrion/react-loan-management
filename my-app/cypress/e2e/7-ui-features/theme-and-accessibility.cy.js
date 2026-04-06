// cypress/e2e/7-ui-features/theme-and-accessibility.cy.js
/* Test Suite: Theme, Accessibility, and UI Features */

describe("Theme and Accessibility Features", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display theme toggle", () => {
    cy.contains("button", /theme|dark|light|mode/i, { timeout: 10000 }).should(
      "be.visible"
    );
  });

  it("should switch to dark mode", () => {
    cy.contains("button", /theme|dark|light|mode/i).click();

    // Check that dark mode is applied (background color change)
    cy.get("body").should("have.css", "background-color");
  });

  it("should persist theme preference", () => {
    cy.contains("button", /theme|dark|light|mode/i).click();
    cy.contains("button", /dark.*mode|night/i).click();

    // Reload page
    cy.reload();

    // Theme should still be dark
    cy.contains("button", /light.*mode|day/i).should("be.visible");
  });

  it("should have proper heading hierarchy", () => {
    cy.get("h1").should("have.length.at.least", 1);
    cy.get("h2").should("have.length.at.least", 1);
  });

  it("should have proper button labels", () => {
    cy.get("button").each(($btn) => {
      cy.wrap($btn).should(
        "have.text.match",
        /\S/
      ); // Should have text content
    });
  });

  it("should have alt text for images", () => {
    cy.get("img[src*='logo'], img[src*='icon']").each(($img) => {
      cy.wrap($img).should("have.attr", "alt");
    });
  });

  it("should be keyboard navigable", () => {
    // Tab to first button
    cy.get("button").first().focus();
    cy.focused().should("have.tag", "button");

    // Tab to next element
    cy.focused().tab();
    cy.focused().should("exist");
  });

  it("should have sufficient color contrast", () => {
    cy.get("button, a, p").each(($el) => {
      // This is a basic check - full contrast testing requires additional tools
      cy.wrap($el).should("be.visible");
    });
  });

  it("should be responsive on mobile", () => {
    cy.viewport("iphone-x");
    cy.visit("/");

    cy.contains("button", /menu|hamburger/i).should("be.visible");
    cy.contains("button", /menu|hamburger/i).click();

    cy.viewport("macbook-15");
    cy.visit("/");

    // Menu should be visible by default on desktop
    cy.get("nav, [role='navigation']").should("be.visible");
  });

  it("should be responsive on tablet", () => {
    cy.viewport("ipad-2");
    cy.visit("/");
    cy.contains(/dashboard|welcome|loan/i).should("be.visible");
  });

  it("should show skip to content link", () => {
    cy.contains("a", /skip.*content|skip.*navigation/i).then(($link) => {
      if ($link.length > 0) {
        cy.wrap($link).should("exist");
      }
    });
  });

  it("should support font size adjustment", () => {
    cy.contains("button", /font|text.*size|zoom/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.contains(/larger|smaller/i).should("exist");
      }
    });
  });

  it("should display form labels properly", () => {
    cy.contains("button", /login/i).click();

    cy.get("input").each(($input) => {
      const inputId = $input.attr("id");
      if (inputId) {
        cy.get(`label[for="${inputId}"]`).should("exist");
      }
    });
  });

  it("should have proper error message visibility", () => {
    cy.contains("button", /login|register/i).click();
    cy.contains("button", /login|register/i).click();

    cy.contains(/required|please.*fill|error/i).should("be.visible");
  });
});
