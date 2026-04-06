import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplyLoan from "../ApplyLoan";
import { submitLoanApplication, fetchUserLoans } from "../../services/loanService";

jest.mock("../../services/loanService", () => ({
  submitLoanApplication: jest.fn(),
  fetchUserLoanDetail: jest.fn(),
  fetchUserLoans: jest.fn(),
}));

const goToFinalStep = async () => {
  await userEvent.click(screen.getByRole("button", { name: /^11\. terms, disclaimer & agreement$/i }));
};

describe("ApplyLoan", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchUserLoans.mockResolvedValue([]);
    submitLoanApplication.mockResolvedValue({ message: "ok" });
  });

  afterEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  test("renders multi-step form with sidebar navigation", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="" />);

    expect(screen.getByRole("heading", { name: /loan application/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. applicant: personal & loan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  test("saves draft from final step", async () => {
    const navigate = jest.fn();
    render(<ApplyLoan navigate={navigate} userEmail="user@test.com" />);

    await goToFinalStep();
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(submitLoanApplication).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith("user-dashboard");
  });

  test("does not submit final application when required fields are missing", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="user@test.com" />);

    await goToFinalStep();
    await userEvent.click(screen.getByLabelText(/accept agreement/i));
    await userEvent.click(screen.getByRole("button", { name: /apply for loan/i }));

    expect(submitLoanApplication).not.toHaveBeenCalled();
  });
});
