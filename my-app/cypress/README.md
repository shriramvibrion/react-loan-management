# Cypress E2E Testing Guide

Comprehensive end-to-end testing suite for the Loan Management System using Cypress.

## Overview

This test suite provides complete coverage of all user workflows, admin functions, API integrations, and edge cases.

**Test Categories:**
- Authentication (Login, Registration, Admin Login)
- Loan Application (Apply, Draft, Submit)
- Loan Management (View Details, Update Contact)
- Document Management (Upload, Download, Delete)
- Admin Workflows (Review, Approve, Reject)
- End-to-End Workflows (Complete user journey)
- Notifications (Application, Status updates)
- UI/UX Features (Theme, Accessibility)
- Error Handling (Network, Server, Validation)
- Performance (Load times, Response times)
- Analytics (Dashboards, Reports, Metrics)

## Project Structure

```
cypress/
├── e2e/                                 # Test specs organized by feature
│   ├── 1-authentication/
│   │   ├── login.cy.js                 # User login tests
│   │   ├── registration.cy.js          # User registration tests
│   │   └── admin-login.cy.js           # Admin login tests
│   ├── 2-loan-application/
│   │   ├── apply-loan.cy.js            # Loan application tests
│   │   └── loan-details.cy.js          # View/manage loan details
│   ├── 3-document-management/
│   │   └── upload-documents.cy.js      # Document upload tests
│   ├── 4-admin-workflows/
│   │   ├── admin-dashboard.cy.js       # Admin dashboard tests
│   │   └── admin-review-approve.cy.js  # Admin review/approval tests
│   ├── 5-e2e-workflows/
│   │   ├── complete-loan-journey.cy.js # Full user journey
│   │   └── multi-user-concurrent.cy.js # Concurrent user tests
│   ├── 6-notifications/
│   │   └── notifications.cy.js         # Notification system tests
│   ├── 7-ui-features/
│   │   └── theme-and-accessibility.cy.js
│   ├── 8-error-scenarios/
│   │   └── error-handling.cy.js        # Error & edge case tests
│   ├── 9-performance/
│   │   └── performance-tests.cy.js     # Performance benchmarks
│   └── 10-analytics/
│       └── dashboards.cy.js            # Analytics dashboard tests
├── fixtures/                           # Test data
│   ├── users.json                     # User test data
│   ├── loans.json                     # Loan test data
│   └── sample.pdf                     # Sample document for upload
├── support/
│   ├── e2e.js                         # Global test setup
│   └── commands.js                    # Custom Cypress commands
└── screenshots/                       # Failed test screenshots
```

## Installation

### 1. Install Cypress

```bash
cd my-app
npm install --save-dev cypress
```

### 2. Initialize Cypress

```bash
npx cypress open
```

This creates the `cypress/` directory structure.

### 3. Configuration

The `cypress.config.js` is already configured with:
- Base URL: `http://localhost:3001`
- API URL: `http://localhost:5000`
- Viewport: 1280x720 (desktop)
- Timeouts: 10 seconds

## Running Tests

### Open Cypress Test Runner (Interactive)

```bash
npm run cypress:open
```

This opens the Cypress UI where you can select and run tests interactively.

### Run All Tests (Headless)

```bash
npm run cypress:run
```

### Run Specific Test File

```bash
npx cypress run --spec "cypress/e2e/1-authentication/login.cy.js"
```

### Run Tests in Specific Category

```bash
# Run all authentication tests
npx cypress run --spec "cypress/e2e/1-authentication/**/*.cy.js"

# Run all e2e tests
npx cypress run --spec "cypress/e2e/5-e2e-workflows/**/*.cy.js"
```

### Run Tests with Different Browser

```bash
# Chrome
npx cypress run --browser chrome

# Firefox
npx cypress run --browser firefox

# Edge
npx cypress run --browser edge
```

### View Test Results

After running tests, results are saved in:
- Screenshots: `cypress/screenshots/`
- Videos: `cypress/videos/`

## Custom Commands

The `cypress/support/commands.js` file provides custom commands for common operations:

### Authentication Commands

```javascript
// Register a user
cy.registerUser({
  email: "test@example.com",
  password: "TestPass123!",
  name: "Test User"
});

// Login as user
cy.loginUser("test@example.com", "TestPass123!");

// Login as admin
cy.loginAdmin("admin@example.com", "AdminPass123!");
```

### Loan Application Commands

```javascript
// Apply for loan
cy.applyLoan({
  amount: 500000,
  tenure: 60,
  cibil: 750
});

// Save draft
cy.saveDraft();

// Submit form
cy.submitForm();

// Accept agreement
cy.acceptAgreement();
```

### API Commands

```javascript
// API register
cy.apiRegister({
  email: "test@example.com",
  password: "TestPass123!"
});

// API login
cy.apiLogin("test@example.com", "TestPass123!");

// API apply loan
cy.apiApplyLoan("test@example.com", {
  amount: 500000,
  tenure: 60,
  cibil: 750
});

// API get loans
cy.apiGetLoans("test@example.com");
```

### Navigation Commands

```javascript
// Navigate to page
cy.navigateTo("Dashboard");

// Wait for loading
cy.waitForLoad();

// Type text with clear
cy.typeText("input[type='email']", "test@example.com");

// Select from dropdown
cy.selectFromDropdown("select", "Home Loan");
```

## Test Data

### Users (cypress/fixtures/users.json)

```json
{
  "validUser": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "phone": "9876543210",
    "city": "Mumbai"
  },
  "adminUser": {
    "email": "admin@example.com",
    "password": "AdminPass123!"
  }
}
```

### Loans (cypress/fixtures/loans.json)

```json
{
  "validLoan": {
    "amount": 500000,
    "tenure": 60,
    "rate": 10,
    "purpose": "Home Loan",
    "fullName": "John Doe",
    "pan": "ABCDE1234F",
    "aadhaar": "123456789012",
    "income": 50000,
    "cibil": 750,
    "employment": "Salaried"
  }
}
```

## Test Execution Flow

### Example: Complete Loan Journey Test

```
1. User Registration
   ├─ Fill registration form
   ├─ Validate email format
   ├─ Validate password strength
   └─ Submit registration

2. User Login
   ├─ Navigate to login
   ├─ Enter credentials
   ├─ Click login
   └─ Verify dashboard access

3. Apply for Loan
   ├─ Click "Apply Loan"
   ├─ Fill loan details
   ├─ Fill applicant details
   ├─ Accept terms
   └─ Submit application

4. View Loan Details
   ├─ Navigate to dashboard
   ├─ Click loan
   ├─ Verify details displayed
   └─ View status

5. Upload Documents
   ├─ Click upload
   ├─ Select file
   ├─ Upload document
   └─ Verify upload

6. Admin Approval
   ├─ Admin login
   ├─ Find loan
   ├─ Review details
   ├─ Add remark
   └─ Approve loan

7. Receive Notification
   ├─ User login
   ├─ Check notifications
   └─ Verify approval message
```

## Best Practices

### 1. Use Data Attributes

Prefer targeting elements with data attributes:

```javascript
// Good
cy.get('[data-testid="submit-button"]').click();

// Avoid
cy.get("button:nth-child(2)").click();
```

### 2. Wait for Elements

Use appropriate waits:

```javascript
// Wait for specific element
cy.contains(/successfully|submitted/i, { timeout: 10000 }).should("be.visible");

// Wait for element to disappear
cy.get('[role="progressbar"]').should("not.exist", { timeout: 5000 });
```

### 3. Use Fixtures for Test Data

```javascript
cy.fixture('users').then((users) => {
  cy.loginUser(users.validUser.email, users.validUser.password);
});
```

### 4. Clean Up After Tests

```javascript
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});
```

### 5. Use Custom Commands

```javascript
// Instead of repeating login steps
cy.registerUser({ email: "test@example.com" });

// Rather than
cy.contains("button", /register/i).click();
// ... fill form ...
cy.contains("button", /register/i).click();
```

## Debugging Tests

### Use debugger

```javascript
cy.visit("/");
cy.debug();  // Pauses test execution
```

### Log values

```javascript
cy.get('input[type="email"]').then(($input) => {
  cy.log("Email input value: " + $input.val());
});
```

### Check network calls

```javascript
cy.intercept("GET", "**/api/user/loans").as("getLo ans");
cy.wait("@getLoans").then((interception) => {
  cy.log("Response:", interception.response.body);
});
```

### Take screenshot

```javascript
cy.screenshot("login-form");
```

### Pause on failure

```bash
npx cypress run --headed --no-exit
```

## Continuous Integration

### GitHub Actions

```yaml
name: Cypress E2E Tests
on: [push, pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          working-directory: my-app
          browser: chrome
          start: npm start
          wait-on: 'http://localhost:3001'
```

### Run in CI/CD

```bash
npm run cypress:ci
```

This command:
1. Starts the application
2. Waits for it to be ready
3. Runs all tests in headless mode
4. Generates reports
5. Stops the application

## Common Issues and Solutions

### Issue: Tests timing out

**Solution:** Increase timeout in `cypress.config.js`

```javascript
defaultCommandTimeout: 15000,  // 15 seconds
responseTimeout: 15000
```

### Issue: Element not found

**Solution:** Use `cy.contains()` with flexible text matching

```javascript
cy.contains(/login|sign.*in/i)  // Case-insensitive match
```

### Issue: API calls fail

**Solution:** Mock API responses in tests

```javascript
cy.intercept("POST", "**/api/user/login", {
  statusCode: 200,
  body: { token: "mock_token" }
});
```

### Issue: Race conditions

**Solution:** Use explicit waits

```javascript
cy.contains(/success/i, { timeout: 10000 }).should("be.visible");
cy.wait(1000);  // Explicit wait if needed
```

## Performance Benchmarks

Target response times:

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Page Load | <3s | <5s |
| Login | <2s | <3s |
| Dashboard | <2s | <3s |
| Loan Application | <3s | <5s |
| Document Upload | <5s | <10s |
| API Response | <1s | <2s |

## Test Coverage

**Current Coverage:**

- Authentication: 7 test cases
- Loan Application: 12 test cases
- Loan Management: 8 test cases
- Document Management: 9 test cases
- Admin Workflows: 9 test cases
- E2E Workflows: 3 test cases
- Notifications: 8 test cases
- UI/Accessibility: 9 test cases
- Error Handling: 10 test cases
- Performance: 10 test cases
- Analytics: 9 test cases

**Total: 94+ test cases**

## Adding New Tests

### 1. Create Test File

```bash
touch cypress/e2e/category/feature.cy.js
```

### 2. Write Test

```javascript
describe("Feature Name", () => {
  it("should do something", () => {
    cy.visit("/");
    cy.contains("button", /action/i).click();
    cy.contains(/success/i).should("be.visible");
  });
});
```

### 3. Run Test

```bash
npx cypress run --spec "cypress/e2e/category/feature.cy.js"
```

## Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Custom Commands](https://docs.cypress.io/api/cypress-api/custom-commands)
- [Assertions](https://docs.cypress.io/guides/references/assertions)

## Support

For issues or questions:
1. Check test videos in `cypress/videos/`
2. Check screenshots in `cypress/screenshots/`
3. Review console logs in Cypress UI
4. Enable debug mode: `DEBUG=cypress:* npm run cypress:run`

---

**Test Suite Version:** 1.0
**Last Updated:** 2024
**Status:** Ready for Production Testing
