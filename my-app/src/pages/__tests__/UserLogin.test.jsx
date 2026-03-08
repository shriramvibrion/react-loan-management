import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../auth/AuthContext";
import { ToastProvider } from "../../context/ToastContext";
import UserLogin from "../UserLogin";

// Wrap component with required providers
function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {ui}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("UserLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("shows validation message when email/password are missing", async () => {
    renderWithProviders(<UserLogin />);

    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(screen.getByText(/please enter email and password/i)).toBeInTheDocument();
  });

  test("calls login and navigates on successful login", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Login successful.",
        user: { email: "user@test.com" },
      }),
    });

    renderWithProviders(<UserLogin />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    // Verify the toast notification appears
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });
});
