// cypress/support/e2e.js
// Support file for all Cypress E2E tests

import "./commands";

// Disable console errors from failing tests
const app = window.top;

if (!app.document.head.querySelector("[data-hide-command-log-request]")) {
  const style = app.document.createElement("style");
  style.innerHTML =
    ".command-name-request, .command-name-xhr { display: none }";
  style.setAttribute("data-hide-command-log-request", "");

  app.document.head.appendChild(style);
}

// Global error handling
Cypress.on("uncaught:exception", (err, runnable) => {
  // Return false to prevent test failure on uncaught exception
  // But log it for debugging
  console.error("Uncaught exception:", err);
  return false;
});

// Before each test
beforeEach(() => {
  // Clear localStorage
  cy.window().then((win) => {
    win.localStorage.clear();
  });

  // Optionally set test environment variables
  cy.wrap(null).then(() => {
    window.TEST_EMAIL = `test_${Date.now()}@example.com`;
    window.TEST_PASSWORD = "TestPass123!";
  });
});

// After each test (optional cleanup)
afterEach(() => {
  // Screenshots on failure are handled by Cypress automatically
});
