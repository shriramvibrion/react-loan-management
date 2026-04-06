// cypress/support/commands.js
// Custom Cypress commands

// User registration command
Cypress.Commands.add("registerUser", (userData) => {
  const user = {
    name: "Test User",
    email: `test_${Date.now()}@example.com`,
    password: "TestPass123!",
    phone: "9876543210",
    city: "Mumbai",
    ...userData,
  };

  cy.visit("/");
  cy.contains("button", /register|sign.*up/i).click();

  cy.get('input[type="text"]').first().type(user.name);
  cy.get('input[type="email"]').first().type(user.email);
  cy.get('input[type="password"]').first().type(user.password);
  cy.get('input[type="password"]').last().type(user.password);
  cy.get('input[placeholder*="phone" i], input[placeholder*="mobile" i]').type(
    user.phone
  );
  cy.get('input[placeholder*="city" i]').type(user.city);

  cy.contains("button", /register|sign.*up/i).click();

  cy.contains(/successfully|registration complete/i, { timeout: 10000 }).should(
    "be.visible"
  );

  return user;
});

// User login command
Cypress.Commands.add("loginUser", (email, password) => {
  cy.visit("/");
  cy.contains("button", /login|sign.*in/i).click();

  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);

  cy.contains("button", /login|sign.*in/i).click();

  cy.contains(/dashboard|welcome|loan/i, { timeout: 10000 }).should("be.visible");
});

// Admin login command
Cypress.Commands.add("loginAdmin", (email, password) => {
  cy.visit("/");
  cy.contains("button", /admin/i).click();
  cy.contains("button", /login|sign.*in/i).click();

  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);

  cy.contains("button", /login|sign.*in/i).click();

  cy.contains(/admin.*dashboard|welcome/i, { timeout: 10000 }).should("be.visible");
});

// Apply loan command
Cypress.Commands.add("applyLoan", (loanData) => {
  const loan = {
    amount: 500000,
    tenure: 60,
    purpose: "Home Loan",
    fullName: "Test User",
    pan: "ABCDE1234F",
    aadhaar: "123456789012",
    income: 50000,
    cibil: 750,
    employment: "Salaried",
    ...loanData,
  };

  cy.contains("button", /apply.*loan|new.*loan/i).click();

  // Fill loan details
  cy.get('input[placeholder*="amount" i]').type(loan.amount);
  cy.get('input[placeholder*="tenure" i]').type(loan.tenure);
  cy.get('select, input[placeholder*="purpose" i]')
    .first()
    .then(($el) => {
      if ($el.is("select")) {
        cy.wrap($el).select(loan.purpose);
      } else {
        cy.wrap($el).type(loan.purpose);
      }
    });

  // Fill applicant details
  cy.get('input[placeholder*="full.*name" i]').type(loan.fullName);
  cy.get('input[placeholder*="pan" i]').type(loan.pan);
  cy.get('input[placeholder*="aadhaar" i]').type(loan.aadhaar);
  cy.get('input[placeholder*="income" i]').type(loan.income);
  cy.get('input[placeholder*="cibil" i]').type(loan.cibil);

  cy.get('select, input[placeholder*="employment" i]')
    .last()
    .then(($el) => {
      if ($el.is("select")) {
        cy.wrap($el).select(loan.employment);
      } else {
        cy.wrap($el).type(loan.employment);
      }
    });

  return loan;
});

// Accept agreement command
Cypress.Commands.add("acceptAgreement", () => {
  cy.get('input[type="checkbox"]').check({ force: true });
  cy.contains("label", /agree|accept|terms/i).should("be.visible");
});

// Submit form command
Cypress.Commands.add("submitForm", () => {
  cy.contains("button", /submit|apply|send/i).click();
});

// Save draft command
Cypress.Commands.add("saveDraft", () => {
  cy.contains("button", /save.*draft|draft/i).click();
});

// API login command (direct API call)
Cypress.Commands.add("apiLogin", (email, password) => {
  cy.request({
    method: "POST",
    url: `${Cypress.env("apiUrl")}/api/user/login`,
    body: {
      email,
      password,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
    return response.body;
  });
});

// API register command
Cypress.Commands.add("apiRegister", (userData) => {
  const user = {
    name: "Test User",
    email: `test_${Date.now()}@example.com`,
    password: "TestPass123!",
    phone: "9876543210",
    city: "Mumbai",
    ...userData,
  };

  cy.request({
    method: "POST",
    url: `${Cypress.env("apiUrl")}/api/user/register`,
    body: user,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

// Apply loan via API
Cypress.Commands.add("apiApplyLoan", (email, loanData) => {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("submission_type", "submit");
  formData.append("agreement_decision", "yes");
  formData.append("loan_amount", loanData.amount || 500000);
  formData.append("tenure", loanData.tenure || 60);
  formData.append("interest_rate", loanData.rate || 10);
  formData.append("loan_purpose", loanData.purpose || "Home Loan");
  formData.append("full_name", loanData.fullName || "Test User");
  formData.append("contact_email", email);
  formData.append("primary_mobile", loanData.phone || "9876543210");
  formData.append("pan_number", loanData.pan || "ABCDE1234F");
  formData.append("aadhaar_number", loanData.aadhaar || "123456789012");
  formData.append("monthly_income", loanData.income || 50000);
  formData.append("cibil_score", loanData.cibil || 750);
  formData.append("employment_type", loanData.employment || "Salaried");

  cy.request({
    method: "POST",
    url: `${Cypress.env("apiUrl")}/api/loan/apply`,
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((response) => {
    expect(response.status).to.be.oneOf([200, 201]);
    return response.body;
  });
});

// Get user loans via API
Cypress.Commands.add("apiGetLoans", (email) => {
  cy.request({
    method: "GET",
    url: `${Cypress.env("apiUrl")}/api/user/loans?email=${email}`,
  }).then((response) => {
    expect(response.status).to.eq(200);
    return response.body;
  });
});

// Navigate to page (by button or link)
Cypress.Commands.add("navigateTo", (pageName) => {
  cy.contains("button, a", new RegExp(pageName, "i")).click();
]);

// Wait for loading
Cypress.Commands.add("waitForLoad", () => {
  cy.get('[role="progressbar"], .loading, .spinner').should("not.exist", {
    timeout: 5000,
  });
});

// Check element visibility
Cypress.Commands.add("shouldBeVisible", (selector) => {
  cy.get(selector).should("be.visible");
});

// Type with clear
Cypress.Commands.add("typeText", (selector, text) => {
  cy.get(selector).clear().type(text);
});

// Select from dropdown
Cypress.Commands.add("selectFromDropdown", (selector, value) => {
  cy.get(selector).select(value);
});
