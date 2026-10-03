import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

/** Renders a component wrapped in the app's providers, with an optional starting route. */
export function renderWithProviders(ui, { route = "/" } = {}) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

/** Marks the "user" as logged in for the AuthContext's initial /auth/me check. */
export function loginAsTestUser() {
  localStorage.setItem("token", "fake-jwt-token");
}
