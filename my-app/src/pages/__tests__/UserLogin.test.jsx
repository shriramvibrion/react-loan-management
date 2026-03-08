import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserLogin from "../UserLogin";

describe("UserLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("shows validation message when email/password are missing", async () => {
    render(<UserLogin navigate={jest.fn()} onLoginSuccess={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(screen.getByText(/please enter email and password/i)).toBeInTheDocument();
  });

  test("calls onLoginSuccess with returned email on successful login", async () => {
    const onLoginSuccess = jest.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Login successful.",
        user: { email: "user@test.com" },
      }),
    });

    render(<UserLogin navigate={jest.fn()} onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith("user@test.com"));
  });
});
