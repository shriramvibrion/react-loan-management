import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IndexPage from "../IndexPage";
import UserLogin from "../UserLogin";
import Documentation from "../Documentation";

describe("Accessibility and UX sanity", () => {
  test("index page primary actions are accessible by role/name", () => {
    render(<IndexPage navigate={jest.fn()} />);
    expect(screen.getByRole("button", { name: "User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  test("user login password toggle is keyboard reachable", async () => {
    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /show password/i })).toHaveFocus();
  });

  test("documentation page has clear navigation affordances", () => {
    render(<Documentation navigate={jest.fn()} onLogout={jest.fn()} />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my loans/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply loan/i })).toBeInTheDocument();
  });
});

