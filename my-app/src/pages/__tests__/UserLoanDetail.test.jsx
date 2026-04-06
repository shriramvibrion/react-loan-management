import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../auth/AuthContext";
import { ToastProvider } from "../../context/ToastContext";
import config from "../../config";
import UserLoanDetail from "../UserLoanDetail";

function renderWithProviders(path = "/user/loan/5") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/user/loan/:loanId" element={<UserLoanDetail />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("UserLoanDetail", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      config.SESSION_KEY,
      JSON.stringify({ email: "user@test.com", role: "user", loginAt: Date.now() })
    );
    window.scrollTo = jest.fn();
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          loan: { loan_id: 5, loan_amount: 100000, tenure: 12, interest_rate: 10, emi: 8792.12, status: "Pending", applied_date: "2026-01-01T00:00:00" },
          applicant: { full_name: "User", contact_email: "old@test.com", primary_mobile: "99999", alternate_mobile: "" },
          documents: [],
        }),
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
  });

  test("shows loan details and refreshes data on demand", async () => {
    renderWithProviders();

    await waitFor(() => expect(screen.getByText(/loan #5/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /refresh now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /refresh now/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});
