import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminRegister from "../AdminRegister";

describe("AdminRegister", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  test("shows validation error when fields are missing", async () => {
    render(<AdminRegister navigate={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.getByText(/all fields are required/i)).toBeInTheDocument();
  });

  test("submits username correctly and redirects to admin login", async () => {
    const navigate = jest.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Admin registered successfully." }),
    });

    render(<AdminRegister navigate={navigate} />);

    await userEvent.type(screen.getByPlaceholderText(/name/i), "Root Admin");
    await userEvent.type(screen.getByPlaceholderText(/email/i), "admin@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      username: "Root Admin",
      email: "admin@test.com",
      password: "secret",
    });

    jest.advanceTimersByTime(1500);
    expect(navigate).toHaveBeenCalledWith("admin-login");
  });
});
