import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminRegister from "../AdminRegister";
import { registerAdmin } from "../../services/authService";

const mockNavigate = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("../../services/authService", () => ({
  registerAdmin: jest.fn(),
}));

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AdminRegister navigate={mockNavigate} />
    </MemoryRouter>
  );
}

describe("AdminRegister", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
    registerAdmin.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("shows validation error when fields are missing", async () => {
    renderWithProviders();

    await userEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.getByText(/all fields are required/i)).toBeInTheDocument();
  });

  test("submits username correctly and redirects to admin login", async () => {
    registerAdmin.mockResolvedValue({ message: "Admin registered successfully." });

    renderWithProviders();

    await userEvent.type(screen.getByPlaceholderText(/name/i), "Root Admin");
    await userEvent.type(screen.getByPlaceholderText(/email/i), "admin@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(registerAdmin).toHaveBeenCalledTimes(1));
    expect(registerAdmin).toHaveBeenCalledWith({
      username: "Root Admin",
      email: "admin@test.com",
      password: "secret123",
    });

    expect(await screen.findByText(/^\s*✅\s*Admin registered successfully\./i)).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Admin registered successfully.");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("admin-login"), {
      timeout: 2500,
    });
  });
});
