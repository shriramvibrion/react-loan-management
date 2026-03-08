import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// Helper to render App with router
function renderApp(initialRoute = "/") {
  // App includes its own BrowserRouter, so we need to directly test
  // the routes. For test isolation we render App (which has its own BrowserRouter).
  // We test the default route renders correctly.
  return render(<App />);
}

test("renders index page actions", async () => {
  renderApp();
  // Wait for lazy-loaded IndexPage to render
  expect(await screen.findByRole("button", { name: /user/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /admin/i })).toBeInTheDocument();
});

test("navigates from index to user login", async () => {
  renderApp();

  const userButton = await screen.findByRole("button", { name: /^user$/i });
  await userEvent.click(userButton);
  expect(await screen.findByText(/user login/i)).toBeInTheDocument();
});
