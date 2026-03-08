import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplyLoan from "../ApplyLoan";

describe("ApplyLoan", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  test("shows session error when user is not logged in", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="" />);

    await userEvent.click(screen.getByRole("button", { name: /apply for loan/i }));
    expect(screen.getByText(/no user session/i)).toBeInTheDocument();
  });

  test("saves local draft", async () => {
    render(<ApplyLoan navigate={jest.fn()} userEmail="user@test.com" />);

    await userEvent.type(screen.getByPlaceholderText(/as per your official id/i), "User");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(localStorage.getItem("loan_draft_user@test.com")).toBeTruthy();
  });

  test("submits application when required fields are provided", async () => {
    localStorage.setItem("loan_draft_user@test.com", JSON.stringify({ form: { full_name: "old" } }));
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Loan application submitted." }),
    });

    render(<ApplyLoan navigate={jest.fn()} userEmail="user@test.com" />);

    await userEvent.clear(screen.getByPlaceholderText(/as per your official id/i));
    await userEvent.type(screen.getByPlaceholderText(/as per your official id/i), "User");
    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/10-digit mobile number/i), "9999999999");
    await userEvent.type(document.querySelector('input[type="date"]'), "1995-01-01");
    await userEvent.type(screen.getByPlaceholderText(/flat \/ house \/ street/i), "Addr line 1");
    await userEvent.type(screen.getByPlaceholderText(/area \/ landmark/i), "Addr line 2");
    await userEvent.type(screen.getByPlaceholderText(/^city$/i), "Chennai");
    await userEvent.type(screen.getByPlaceholderText(/^state$/i), "Tamil Nadu");
    await userEvent.type(screen.getByPlaceholderText(/600001/i), "600001");
    await userEvent.type(screen.getByPlaceholderText(/e.g. 500000/i), "100000");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "12");
    await userEvent.selectOptions(selects[1], "Home Loan");
    await userEvent.selectOptions(screen.getByDisplayValue("Select"), "Other");
    await userEvent.type(screen.getByPlaceholderText(/abcde1234f/i), "ABCDE1234F");
    await userEvent.type(screen.getByPlaceholderText(/12-digit aadhaar/i), "123412341234");
    await userEvent.type(screen.getByPlaceholderText(/^e\.g\. 50000$/i), "50000");
    await userEvent.type(screen.getByPlaceholderText(/company \/ institution name/i), "Test Org");
    await userEvent.type(
      screen.getByPlaceholderText(/share any special requirements/i),
      "Test notes"
    );

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const files = Array.from({ length: fileInputs.length }, (_, index) =>
      new File([`file-${index}`], `file-${index}.pdf`, { type: "application/pdf" })
    );
    for (let i = 0; i < fileInputs.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.upload(fileInputs[i], files[i]);
    }

    await userEvent.click(screen.getByLabelText(/accept agreement/i));
    await userEvent.click(screen.getByRole("button", { name: /apply for loan/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("loan_draft_user@test.com")).toBeNull();
  });
});
