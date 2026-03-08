import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDashboard from "../UserDashboard";

describe("UserDashboard", () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  test("shows draft button and navigates to apply loan", async () => {
    const navigate = jest.fn();
    localStorage.setItem("loan_draft_user@test.com", JSON.stringify({ form: { full_name: "U" } }));

    render(<UserDashboard navigate={navigate} userEmail="user@test.com" />);

    await waitFor(() => expect(screen.getByText(/my loans/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /draft/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply for loan/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /apply for loan/i }));
    expect(navigate).toHaveBeenCalledWith("apply-loan");
  });
});
