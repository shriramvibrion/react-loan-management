import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../auth/AuthContext";
import { ToastProvider } from "../../context/ToastContext";
import { ThemeProvider } from "../../context/ThemeContext";
import config from "../../config";
import IndexPage from "../IndexPage";
import UserLogin from "../UserLogin";
import Documentation from "../Documentation";

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Accessibility and UX sanity", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      config.SESSION_KEY,
      JSON.stringify({ email: "user@test.com", role: "user", loginAt: Date.now() })
    );
  });

  test("index page primary actions are accessible by role/name", () => {
    renderWithProviders(<IndexPage />);
    expect(screen.getByRole("button", { name: "User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  test("user login password toggle is keyboard reachable", async () => {
    renderWithProviders(<UserLogin />);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /show password/i })).toHaveFocus();
  });

  test("documentation page has clear navigation affordances", () => {
    renderWithProviders(<Documentation />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my loans/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply loan/i })).toBeInTheDocument();
  });
});

