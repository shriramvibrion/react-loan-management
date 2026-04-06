// cypress/e2e/3-document-management/upload-documents.cy.js
/* Test Suite: Document Upload and Management */

describe("Document Upload and Management", () => {
  let testEmail;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;
    // Register, login, and apply for a loan
    cy.registerUser({
      email: testEmail,
      password: "TestPass123!",
    }).then(() => {
      cy.loginUser(testEmail, "TestPass123!");
      cy.applyLoan({
        amount: 500000,
        tenure: 60,
        cibil: 750,
      });
      cy.acceptAgreement();
      cy.submitForm();

      // Navigate to loan details
      cy.wait(1000);
      cy.contains("button, a, tr", /view|details|loan/i).click();
    });
  });

  it("should show document upload section", () => {
    cy.contains(/documents|upload.*documents|required.*documents/i).should(
      "be.visible"
    );
  });

  it("should list required document types", () => {
    cy.contains(/aadhar|aadhaar/i).should("be.visible");
    cy.contains(/pan/i).should("be.visible");
    cy.contains(/income|salary/i).should("be.visible");
  });

  it("should allow file upload", () => {
    cy.contains("button", /upload|add.*document|choose.*file/i).click();

    // Create a test file
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });

    cy.contains("button", /upload|submit/i).click();
    cy.contains(/uploaded|success/i).should("be.visible");
  });

  it("should validate file type", () => {
    cy.contains("button", /upload|add.*document/i).click();

    cy.get('input[type="file"]').selectFile(
      "cypress/fixtures/invalid.exe",
      { force: true }
    );

    cy.contains("button", /upload/i).click();
    cy.contains(/only.*pdf|invalid.*file|type.*not.*allowed/i).should("be.visible");
  });

  it("should validate file size", () => {
    cy.contains("button", /upload|add.*document/i).click();

    // Try uploading large file
    cy.get('input[type="file"]').selectFile(
      "cypress/fixtures/large-file.pdf",
      { force: true }
    );

    cy.contains("button", /upload/i).click();
    cy.contains(/too.*large|file.*size|maximum.*size/i).should("be.visible");
  });

  it("should show upload progress", () => {
    cy.contains("button", /upload|add.*document/i).click();

    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });

    cy.contains("button", /upload/i).click();

    // Look for progress bar
    cy.get('[role="progressbar"], .progress, .upload-progress').should(
      "exist"
    );
  });

  it("should allow multiple document uploads", () => {
    // Upload first document
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    // Upload second document
    cy.wait(1000);
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    cy.contains(/2.*documents|both.*uploaded/i).should("be.visible");
  });

  it("should display uploaded documents list", () => {
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    cy.wait(1000);
    cy.contains(/uploaded|submitted.*documents/i).should("be.visible");
  });

  it("should allow downloading uploaded documents", () => {
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    cy.wait(1000);
    cy.contains("button", /download/i).click();

    // Verify download
    cy.readFile("cypress/downloads/document.pdf", { timeout: 10000 }).should(
      "exist"
    );
  });

  it("should allow deleting uploaded documents", () => {
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    cy.wait(1000);
    cy.contains("button", /delete|remove/i).click();
    cy.contains("button", /confirm|yes|delete/i).click();

    cy.contains(/deleted|removed|successfully/i).should("be.visible");
  });

  it("should show document status", () => {
    cy.contains("button", /upload|add.*document/i).click();
    cy.fixture("sample.pdf").then((fileContent) => {
      cy.get('input[type="file"]').selectFile("cypress/fixtures/sample.pdf", {
        force: true,
      });
    });
    cy.contains("button", /upload/i).click();

    cy.wait(1000);
    cy.contains(/pending|verified|approved|rejected/i).should("be.visible");
  });

  it("should require all mandatory documents before submission", () => {
    cy.contains("button", /submit.*application|apply|finalize/i).click();

    cy.contains(/upload.*all.*documents|mandatory|required/i).should("be.visible");
  });
});
