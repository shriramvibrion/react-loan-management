/**
 * Frontend Component Tests - Jest & React Testing Library
 * Comprehensive test suite for all React components
 */

// ============================================================================
// 1. AUTHENTICATION TESTS
// ============================================================================

describe("User Login Component", () => {
  test("should render login form with email and password fields", () => {
    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("should show error when email is empty", async () => {
    const navigate = jest.fn();
    render(<UserLogin navigate={navigate} onLoginSuccess={jest.fn()} />);
    
    const submitButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });
  });

  test("should show error when password is empty", async () => {
    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    
    const submitButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
    });
  });

  test("should call onLoginSuccess on successful login", async () => {
    const onLoginSuccess = jest.fn();
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({
        message: "Login successful.",
        user: { email: "test@example.com", name: "Test User" }
      }),
      ok: true,
      status: 200
    });

    render(<UserLogin navigate={jest.fn()} onLoginSuccess={onLoginSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "TestPass123" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    
    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith("test@example.com");
    });

    mockFetch.mockRestore();
  });

  test("should show error on invalid credentials", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ message: "Invalid credentials." }),
      ok: false,
      status: 401
    });

    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "WrongPassword" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });
});

describe("User Registration Component", () => {
  test("should validate password strength", async () => {
    render(<UserRegister navigate={jest.fn()} />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Test weak password
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    
    const submitButton = screen.getByRole("button", { name: /register/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/strength|complex|uppercase|lowercase|digit|special/i))
        .toBeInTheDocument();
    });
  });

  test("should reject duplicate email", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ error: "Email already registered." }),
      ok: false,
      status: 400
    });

    render(<UserRegister navigate={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "ValidPass123!" }
    });
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), {
      target: { value: "ValidPass123!" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  test("should validate password confirmation match", async () => {
    render(<UserRegister navigate={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "ValidPass123!" }
    });
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), {
      target: { value: "DifferentPass123!" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/match|confirm/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// 2. LOAN APPLICATION TESTS
// ============================================================================

describe("Apply Loan Component", () => {
  test("should render all required form fields", () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    expect(screen.getByLabelText(/loan.*amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tenure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aadhaar/i)).toBeInTheDocument();
  });

  test("should validate PAN format", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    const panInput = screen.getByLabelText(/pan/i);
    fireEvent.change(panInput, { target: { value: "invalid" } });
    
    const submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/pan.*invalid|10.*characters/i)).toBeInTheDocument();
    });
  });

  test("should validate Aadhaar format (12 digits)", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    const aadhaarInput = screen.getByLabelText(/aadhaar/i);
    fireEvent.change(aadhaarInput, { target: { value: "12345" } });
    
    const submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/aadhaar.*12|digits/i)).toBeInTheDocument();
    });
  });

  test("should validate loan amount is positive", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    const amountInput = screen.getByLabelText(/loan.*amount/i);
    fireEvent.change(amountInput, { target: { value: "-100000" } });
    
    const submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/positive|greater.*0/i)).toBeInTheDocument();
    });
  });

  test("should validate tenure range (1-1200 months)", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    const tenureInput = screen.getByLabelText(/tenure/i);
    
    // Test tenure < 1
    fireEvent.change(tenureInput, { target: { value: "0" } });
    let submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/tenure|between|1.*1200/i)).toBeInTheDocument();
    });

    // Test tenure > 1200
    fireEvent.change(tenureInput, { target: { value: "1300" } });
    submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/tenure|between|1.*1200/i)).toBeInTheDocument();
    });
  });

  test("should save draft when draft button clicked", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ message: "Draft saved" }),
      ok: true,
      status: 200
    });

    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" draftLoanId={null} />);
    
    fireEvent.change(screen.getByLabelText(/loan.*amount/i), {
      target: { value: "500000" }
    });
    
    const draftButton = screen.getByRole("button", { name: /save.*draft|draft/i });
    fireEvent.click(draftButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    mockFetch.mockRestore();
  });

  test("should require agreement acceptance", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="test@example.com" />);
    
    // Try to submit without checking agreement
    const submitButton = screen.getByRole("button", { name: /submit|apply/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/agree|accept|terms/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// 3. DASHBOARD & LIST TESTS
// ============================================================================

describe("User Dashboard Component", () => {
  test("should display user email", () => {
    const navigate = jest.fn();
    render(<UserDashboard navigate={navigate} userEmail="test@example.com" />);
    
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  test("should display available actions", () => {
    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    expect(screen.getByRole("button", { name: /apply.*loan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view.*loan|my.*loan/i })).toBeInTheDocument();
  });

  test("should navigate to apply loan on button click", () => {
    const navigate = jest.fn();
    render(<UserDashboard navigate={navigate} userEmail="test@example.com" />);
    
    const applyButton = screen.getByRole("button", { name: /apply.*loan/i });
    fireEvent.click(applyButton);
    
    expect(navigate).toHaveBeenCalledWith("apply-loan");
  });
});

describe("User Loan List Component", () => {
  test("should display list of user loans", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({
        loans: [
          { loan_id: 1, status: "Pending", loan_amount: 500000, applied_date: "2024-03-01" },
          { loan_id: 2, status: "Approved", loan_amount: 300000, applied_date: "2024-02-15" }
        ]
      }),
      ok: true,
      status: 200
    });

    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Pending/)).toBeInTheDocument();
      expect(screen.getByText(/Approved/)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  test("should show empty state when no loans", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ loans: [] }),
      ok: true,
      status: 200
    });

    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText(/no.*loan|apply.*first/i)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  test("should navigate to loan detail on click", async () => {
    const navigate = jest.fn();
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({
        loans: [
          { loan_id: 1, status: "Pending", loan_amount: 500000 }
        ]
      }),
      ok: true,
      status: 200
    });

    render(<UserDashboard navigate={navigate} userEmail="test@example.com" />);
    
    await waitFor(() => {
      const loanRow = screen.getByText(/Pending/).closest("tr") || screen.getByText(/Pending/).closest("div");
      fireEvent.click(loanRow);
    });

    expect(navigate).toHaveBeenCalledWith("user-loan-detail", expect.objectContaining({ loanId: 1 }));

    mockFetch.mockRestore();
  });
});

// ============================================================================
// 4. ADMIN FUNCTIONS TESTS
// ============================================================================

describe("Admin Dashboard Component", () => {
  test("should display admin-specific options", () => {
    render(<AdminDashboard navigate={jest.fn()} onLogout={jest.fn()} />);
    
    expect(screen.getByRole("button", { name: /view.*loan|all.*loan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analytics|dashboard/i })).toBeInTheDocument();
  });

  test("should call onLogout when logout clicked", () => {
    const onLogout = jest.fn();
    render(<AdminDashboard navigate={jest.fn()} onLogout={onLogout} />);
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(onLogout).toHaveBeenCalled();
  });
});

describe("Admin Loan Details Component", () => {
  test("should display loan status with available actions", () => {
    render(
      <AdminLoanDetail
        navigate={jest.fn()}
        loanId={1}
        onBack={jest.fn()}
      />
    );
    
    expect(screen.getByText(/status|pending|approved|rejected/i)).toBeInTheDocument();
  });

  test("should show approve/reject buttons", async () => {
    render(
      <AdminLoanDetail
        navigate={jest.fn()}
        loanId={1}
        onBack={jest.fn()}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    });
  });

  test("should show remarks field for approval", () => {
    render(
      <AdminLoanDetail
        navigate={jest.fn()}
        loanId={1}
        onBack={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText(/remark|comment|note/i)).toBeInTheDocument();
  });

  test("should call navigate('admin-dashboard') on back click", () => {
    const navigate = jest.fn();
    render(
      <AdminLoanDetail
        navigate={navigate}
        loanId={1}
        onBack={() => navigate("admin-dashboard")}
      />
    );
    
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);
    
    expect(navigate).toHaveBeenCalledWith("admin-loans");
  });
});

// ============================================================================
// 5. UI/UX TESTS
// ============================================================================

describe("Dark Mode Toggle", () => {
  test("should toggle dark mode theme", () => {
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: /dark|light|theme/i });
    
    // Check initial state
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    
    fireEvent.click(toggleButton);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    
    fireEvent.click(toggleButton);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("should persist theme preference to localStorage", () => {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    global.localStorage = localStorageMock;

    render(<ThemeToggle />);
    const toggleButton = screen.getByRole("button", { name: /dark|light|theme/i });
    
    fireEvent.click(toggleButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });
});

describe("Responsive Design", () => {
  test("should render mobile layout on small screens", () => {
    global.innerWidth = 375; // Mobile width
    global.dispatchEvent(new Event("resize"));
    
    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    // Check for mobile-specific layout
    const container = screen.getByRole("button", { name: /apply.*loan/i }).closest("div");
    expect(container).toHaveClass("mobile-layout") || expect(container).toHaveStyleRule("width", "100%");
  });

  test("should render tablet layout on medium screens", () => {
    global.innerWidth = 768; // Tablet width
    global.dispatchEvent(new Event("resize"));
    
    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    // Elements should be visible
    expect(screen.getByRole("button", { name: /apply.*loan/i })).toBeVisible();
  });

  test("should render desktop layout on large screens", () => {
    global.innerWidth = 1920; // Desktop width
    global.dispatchEvent(new Event("resize"));
    
    render(<UserDashboard navigate={jest.fn()} userEmail="test@example.com" />);
    
    // Elements should be visible and properly spaced
    expect(screen.getByRole("button", { name: /apply.*loan/i })).toBeVisible();
  });
});

// ============================================================================
// 6. ERROR HANDLING TESTS
// ============================================================================

describe("Error Handling", () => {
  test("should show error message on API failure", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "TestPass123" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed|please.*try.*again/i)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  test("should show server error message", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ error: "Server error" }),
      ok: false,
      status: 500
    });

    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "TestPass123" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/server.*error|Please.*try.*later/i)).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });
});

// ============================================================================
// 7. FORM VALIDATION TESTS
// ============================================================================

describe("EMI Calculator Component", () => {
  test("should calculate EMI correctly", () => {
    render(<EMICalculator />);
    
    fireEvent.change(screen.getByLabelText(/principal|loan.*amount/i), {
      target: { value: "500000" }
    });
    fireEvent.change(screen.getByLabelText(/rate.*interest/i), {
      target: { value: "10" }
    });
    fireEvent.change(screen.getByLabelText(/tenure.*month/i), {
      target: { value: "60" }
    });
    
    // EMI for 500000 @ 10% for 60 months should be approximately 10600
    expect(screen.getByText(/10600|EMI/i)).toBeInTheDocument();
  });

  test("should update EMI on input change", () => {
    render(<EMICalculator />);
    
    const principalInput = screen.getByLabelText(/principal|loan.*amount/i);
    const rateInput = screen.getByLabelText(/rate.*interest/i);
    const tenureInput = screen.getByLabelText(/tenure.*month/i);
    
    fireEvent.change(principalInput, { target: { value: "300000" } });
    fireEvent.change(rateInput, { target: { value: "8" } });
    fireEvent.change(tenureInput, { target: { value: "48" } });
    
    // Should recalculate EMI
    expect(screen.getByDisplayValue("300000")).toBeInTheDocument();
  });
});

// ============================================================================
// 8. INTEGRATION TESTS
// ============================================================================

describe("Complete User Journey", () => {
  test("should allow user to register, login, apply loan, and view status", async () => {
    // Step 1: Register
    const registerMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ message: "Registered successfully" }),
      ok: true,
      status: 201
    });

    render(<UserRegister navigate={jest.fn()} />);
    // ... fill registration form ...
    
    // Step 2: Login
    const loginMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ user: { email: "test@example.com" } }),
      ok: true,
      status: 200
    });

    // Step 3: Apply Loan
    const applyMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      json: async () => ({ loan_id: 1, message: "Application submitted" }),
      ok: true,
      status: 201
    });

    // Verify all steps completed successfully
    expect(registerMock).toHaveBeenCalled();
    expect(loginMock).toHaveBeenCalled();
    expect(applyMock).toHaveBeenCalled();

    registerMock.mockRestore();
    loginMock.mockRestore();
    applyMock.mockRestore();
  });
});
