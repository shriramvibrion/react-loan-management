import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../auth/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";
import config from "../../config";
import UserDashboard from "../UserDashboard";

const mockNavigate = jest.fn();

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <UserDashboard navigate={mockNavigate} />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("UserDashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(
      config.SESSION_KEY,
      JSON.stringify({ email: "user@test.com", role: "user", loginAt: Date.now() })
    );
    mockNavigate.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        loans: [
          { loan_id: 1, loan_amount: 100000, tenure: 12, status: "Pending", applied_date: "2026-01-01T00:00:00" },
          { loan_id: 2, loan_amount: 80000, tenure: 10, status: "Approved", applied_date: "2026-02-01T00:00:00" },
        ],
      }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  test("shows draft button and navigates to apply loan", async () => {
    localStorage.setItem("ezl_apply_draft", JSON.stringify({ _draftOwner: "user@test.com", full_name: "U" }));

    renderWithProviders();

    await waitFor(() => expect(screen.getByText(/my loan applications/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /draft/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply new/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /apply new/i }));
    expect(mockNavigate).toHaveBeenCalledWith("apply-loan");
  });
});
