# Cypress E2E Testing - Quick Start

## Prerequisites

- Node.js and npm installed
- Application running on `http://localhost:3001`
- Backend API running on `http://localhost:5000`

## Quick Setup

### 1. Install Cypress

```bash
cd my-app
npm install --save-dev cypress
```

### 2. Start Application

Terminal 1 - Frontend:
```bash
cd my-app
npm start
```

Terminal 2 - Backend:
```bash
cd backend
python app.py
```

### 3. Open Cypress

Terminal 3:
```bash
cd my-app
npx cypress open
```

This opens the Cypress Test Runner where you can see all tests and run them individually.

## Run Tests

### All Tests
```bash
npx cypress run
```

### Specific Category
```bash
# Authentication tests
npx cypress run --spec "cypress/e2e/1-authentication/**/*.cy.js"

# Loan application tests
npx cypress run --spec "cypress/e2e/2-loan-application/**/*.cy.js"

# Admin workflow tests
npx cypress run --spec "cypress/e2e/4-admin-workflows/**/*.cy.js"

# End-to-end workflow tests
npx cypress run --spec "cypress/e2e/5-e2e-workflows/**/*.cy.js"

# Performance tests
npx cypress run --spec "cypress/e2e/9-performance/**/*.cy.js"
```

### Single Test File
```bash
npx cypress run --spec "cypress/e2e/1-authentication/login.cy.js"
```

### With Specific Browser
```bash
# Chrome
npx cypress run --browser chrome

# Firefox
npx cypress run --browser firefox

# Edge
npx cypress run --browser edge
```

### Headless Mode (CI/CD)
```bash
npx cypress run --headless
```

### With Video Recording
```bash
npx cypress run --record
```

## View Results

After running tests:
- Screenshots: `cypress/screenshots/` (failed tests only by default)
- Videos: `cypress/videos/` (all tests)

## Test Structure

Each test file follows this pattern:

```javascript
describe("Feature Category", () => {
  beforeEach(() => {
    // Setup before each test
    cy.visit("/");
  });

  it("should do specific action", () => {
    // Test steps
    cy.contains("button", /text/i).click();
    
    // Assertion
    cy.contains(/expected result/i).should("be.visible");
  });

  it("should handle error scenario", () => {
    // Another test
  });
});
```

## Custom Commands

Pre-built commands are available in `cypress/support/commands.js`:

```javascript
// User registration
cy.registerUser({
  email: "test@example.com",
  password: "TestPass123!",
  name: "Test User"
});

// User login
cy.loginUser("test@example.com", "TestPass123!");

// Apply for loan
cy.applyLoan({
  amount: 500000,
  tenure: 60,
  cibil: 750
});

// Accept agreement
cy.acceptAgreement();

// Submit form
cy.submitForm();

// Save draft
cy.saveDraft();
```

## Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `1-authentication/login.cy.js` | 8 | User login scenarios |
| `1-authentication/registration.cy.js` | 9 | User registration |
| `1-authentication/admin-login.cy.js` | 4 | Admin authentication |
| `2-loan-application/apply-loan.cy.js` | 12 | Loan application |
| `2-loan-application/loan-details.cy.js` | 9 | Loan details view |
| `3-document-management/upload-documents.cy.js` | 9 | Document upload |
| `4-admin-workflows/admin-dashboard.cy.js` | 10 | Admin dashboard |
| `4-admin-workflows/admin-review-approve.cy.js` | 10 | Admin approval |
| `5-e2e-workflows/complete-loan-journey.cy.js` | 1 | Full user journey |
| `5-e2e-workflows/multi-user-concurrent.cy.js` | 3 | Concurrent users |
| `6-notifications/notifications.cy.js` | 9 | Notification system |
| `7-ui-features/theme-and-accessibility.cy.js` | 11 | UI/Accessibility |
| `8-error-scenarios/error-handling.cy.js` | 10 | Error handling |
| `9-performance/performance-tests.cy.js` | 10 | Performance |
| `10-analytics/dashboards.cy.js` | 10 | Analytics |

## Debugging

### Pause Execution
```javascript
cy.debug();  // Pauses test
```

### Log Values
```javascript
cy.get('input').then(($el) => {
  cy.log("Value: " + $el.val());
});
```

### Take Screenshot
```javascript
cy.screenshot("test-name");
```

### View Network Calls
```javascript
cy.intercept("GET", "**/api/**").as("apiCall");
cy.wait("@apiCall").then((interception) => {
  cy.log(JSON.stringify(interception.response.body));
});
```

### Run Single Test in Headed Mode
```bash
npx cypress run --headed --spec "cypress/e2e/1-authentication/login.cy.js"
```

## npm Script Shortcuts

If you add these scripts to `package.json`:

```bash
# Run all tests
npm run cypress:run

# Open Cypress UI
npm run cypress:open

# Run specific category
npm run cypress:run:auth
npm run cypress:run:loans
npm run cypress:run:admin
npm run cypress:run:e2e
npm run cypress:run:performance
npmrun cypress:run:error
```

## Best Practices

1. **Use flexible text matching:**
   ```javascript
   cy.contains(/login|sign.*in/i)  // Case-insensitive
   ```

2. **Wait for elements properly:**
   ```javascript
   cy.contains(/success/i, { timeout: 10000 }).should("be.visible");
   ```

3. **Use test IDs for critical elements:**
   ```javascript
   cy.get('[data-testid="submit-btn"]').click();
   ```

4. **Avoid hard waits:**
   ```javascript
   cy.wait(1000);  // Only use when absolutely necessary
   ```

5. **Clean up test data:**
   ```javascript
   beforeEach(() => {
     cy.window().then((win) => win.localStorage.clear());
   });
   ```

## Expected Results

### Successful Test Run
- All tests pass ✅
- Screenshots show successful interactions
- Videos record complete workflows
- No console errors

### Common Test Scenarios

1. **User Registration → Login → Apply Loan → View Status**
2. **Admin Reviews → Approves → User Gets Notification**
3. **Document Upload → Verification → Approval**
4. **Multiple Users → Concurrent Loans → Dashboard Stats**
5. **Error Scenarios → Graceful Handling → Recovery**

## Troubleshooting

**Tests timing out?**
- Increase timeout: `{ timeout: 15000 }`
- Check backend API is running

**API calls failing?**
- Verify backend is running on `http://localhost:5000`
- Check CORS configuration

**Element not found?**
- Use `cy.contains(/text/i)` for flexible matching
- Check element visibility with `cy.get(...).should("be.visible")`

**Tests passing locally but failing in CI?**
- Check environment variables
- Verify database is seeded
- Check base URLs in config

---

For full documentation, see [cypress/README.md](./README.md)
