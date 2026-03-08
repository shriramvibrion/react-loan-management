import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "../AdminDashboard";

describe("AdminDashboard", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        loans: [
          { loan_id: 10, user_id: 1, user_name: "Alice", user_email: "alice@test.com", status: "Pending", applied_date: "2026-01-10T00:00:00" },
          { loan_id: 12, user_id: 2, user_name: "Bob", user_email: "bob@test.com", status: "Rejected", applied_date: "2026-01-12T00:00:00" },
        ],
      }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("loads loans and supports searching + row click navigation", async () => {
    const navigate = jest.fn();

    render(<AdminDashboard navigate={navigate} onLogout={jest.fn()} />);

    await waitFor(() => expect(screen.getByText(/loan #1/i)).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText(/search by loan id/i), "bob");
    expect(screen.getByText(/bob@test.com/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText(/loan #2/i));
    expect(navigate).toHaveBeenCalledWith("admin-loan-detail", { loanId: 12 });
  });
});
