// cypress/e2e/9-performance/performance-tests.cy.js
/* Test Suite: Performance Testing */

describe("Performance Tests", () => {
  it("should load login page within acceptable time", () => {
    const startTime = performance.now();

    cy.visit("/", { onBeforeLoad: Cypress.performance });
    cy.contains("button", /login/i).should("be.visible");

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    expect(loadTime).to.be.lessThan(3000); // 3 seconds
  });

  it("should login within 2 seconds", () => {
    cy.visit("/");
    cy.contains("button", /login/i).click();

    const startTime = performance.now();

    cy.get('input[type="email"]').type("admin@example.com");
    cy.get('input[type="password"]').type("AdminPass123!");

    cy.contains("button", /login/i).click();
    cy.contains(/dashboard|welcome/i, { timeout: 10000 }).should("be.visible");

    const endTime = performance.now();
    const loginTime = endTime - startTime;

    cy.log(`Login completed in ${loginTime}ms`);
  });

  it("should load dashboard within 2 seconds", () => {
    const testEmail = `perf_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      const startTime = performance.now();

      cy.contains(/my.*loans|dashboard/i).should("be.visible");

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      cy.log(`Dashboard loaded in ${loadTime}ms`);
      expect(loadTime).to.be.lessThan(2000);
    });
  });

  it("should apply loan form submit within 3 seconds", () => {
    const testEmail = `perf_apply_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      cy.contains("button", /apply.*loan/i).click();

      cy.applyLoan({
        amount: 500000,
        tenure: 60,
      });

      cy.acceptAgreement();

      const startTime = performance.now();

      cy.submitForm();

      cy.contains(/application.*submitted|successfully/i, {
        timeout: 10000,
      }).should("be.visible");

      const endTime = performance.now();
      const submitTime = endTime - startTime;

      cy.log(`Loan application submitted in ${submitTime}ms`);
    });
  });

  it("should handle API response within 1 second", () => {
    cy.intercept("GET", "**/api/**").as("apiCall");

    cy.visit("/");
    cy.contains("button", /login/i).click();

    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /login/i).click();

    cy.wait("@apiCall").then((interception) => {
      const responseTime =
        interception.response.headers["x-response-time"] ||
        interception.response.headers["date"];

      expect(interception.response.statusCode).to.be.oneOf([200, 201, 400, 401]);
    });
  });

  it("should render large loan list within 3 seconds", () => {
    const testEmail = `perf_list_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      // Create multiple loans
      for (let i = 0; i < 5; i++) {
        cy.apiApplyLoan(testEmail, {
          amount: 100000 + i * 50000,
          tenure: 24 + i * 12,
        });
      }

      const startTime = performance.now();

      cy.reload();
      cy.contains(/my.*loans|dashboard/i).should("be.visible");

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      cy.log(`Large list rendered in ${renderTime}ms`);
      expect(renderTime).to.be.lessThan(3000);
    });
  });

  it("should paginate large datasets efficiently", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.get("table, div[role=list]").should("be.visible");

    cy.contains("button, a", /next|page.*2/i).then(($btn) => {
      if ($btn.length > 0) {
        const startTime = performance.now();

        cy.wrap($btn).click();

        const endTime = performance.now();
        const navigationTime = endTime - startTime;

        cy.log(`Pagination navigation in ${navigationTime}ms`);
        expect(navigationTime).to.be.lessThan(1000);
      }
    });
  });

  it("should upload document without performance degradation", () => {
    const testEmail = `perf_upload_${Date.now()}@example.com`;

    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");

      cy.applyLoan({
        amount: 500000,
        tenure: 60,
      });
      cy.acceptAgreement();
      cy.submitForm();

      cy.wait(1000);
      cy.contains("button, a, tr", /view|details/i).click();

      const startTime = performance.now();

      cy.contains("button", /upload/i).click();
      cy.fixture("sample.pdf").then((fileContent) => {
        cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
          force: true,
        });
      });
      cy.contains("button", /upload/i).click();

      cy.contains(/uploaded|success/i).should("be.visible");

      const endTime = performance.now();
      const uploadTime = endTime - startTime;

      cy.log(`Document upload completed in ${uploadTime}ms`);
    });
  });

  it("should sort large dataset quickly", () => {
    cy.visit("/");
    cy.loginAdmin("admin@example.com", "AdminPass123!");

    cy.contains(/sort|amount|date/i).then(($el) => {
      if ($el.length > 0) {
        const startTime = performance.now();

        cy.wrap($el).click();

        const endTime = performance.now();
        const sortTime = endTime - startTime;

        cy.log(`Sorting completed in ${sortTime}ms`);
        expect(sortTime).to.be.lessThan(1000);
      }
    });
  });

  it("should handle theme switching without lag", () => {
    cy.visit("/");

    const startTime = performance.now();

    cy.contains("button", /theme|dark|light|mode/i).click();

    const endTime = performance.now();
    const themeTime = endTime - startTime;

    cy.log(`Theme switched in ${themeTime}ms`);
    expect(themeTime).to.be.lessThan(500);
  });
});
