import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserLoanDetail from "../UserLoanDetail";

describe("UserLoanDetail", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loan: { loan_id: 5, loan_amount: 100000, tenure: 12, interest_rate: 10, emi: 8792.12, status: "Pending", applied_date: "2026-01-01T00:00:00" },
          applicant: { full_name: "User", contact_email: "old@test.com", primary_mobile: "99999", alternate_mobile: "" },
          documents: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Contact details updated successfully." }),
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("allows editing and saving contact details", async () => {
    render(
      <UserLoanDetail
        navigate={jest.fn()}
        userEmail="user@test.com"
        loanId={5}
        onBack={jest.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText(/loan #5/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /edit contact/i }));
    const emailInput = screen.getByDisplayValue("old@test.com");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "new@test.com");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [, patchOptions] = global.fetch.mock.calls[1];
    expect(JSON.parse(patchOptions.body)).toMatchObject({ contact_email: "new@test.com" });
  });
});
