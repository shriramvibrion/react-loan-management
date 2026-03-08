import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

test("renders index page actions", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /user/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /admin/i })).toBeInTheDocument();
});

test("navigates from index to user login", async () => {
  render(<App />);

  await userEvent.click(screen.getByRole("button", { name: /^user$/i }));
  expect(screen.getByText(/user login/i)).toBeInTheDocument();
});
