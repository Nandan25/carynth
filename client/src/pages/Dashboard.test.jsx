import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import Dashboard from "./Dashboard.jsx";
import { renderWithProviders, loginAsTestUser } from "../test/testUtils.jsx";
import { server } from "../test/server.js";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

beforeEach(() => {
  navigateMock.mockClear();
});

describe("Dashboard page", () => {
  it("renders the user's resumes from the API", async () => {
    loginAsTestUser();
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Product Manager Resume")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer Resume")).toBeInTheDocument();
  });

  it("shows the resume count", async () => {
    loginAsTestUser();
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText(/2 resumes/i)).toBeInTheDocument();
  });

  it("imports a resume from an uploaded PDF and navigates to its editor", async () => {
    loginAsTestUser();
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await screen.findByText("Product Manager Resume");

    const file = new File(["%PDF-1.4 fake pdf content"], "resume.pdf", { type: "application/pdf" });
    await user.upload(screen.getByTestId("pdf-import-input"), file);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/editor/resume-imported");
    });
  });

  it("shows an error message if the import fails", async () => {
    server.use(
      http.post("*/api/resumes/import", () => {
        return HttpResponse.json(
          { message: "Couldn't extract readable text from this PDF." },
          { status: 422 }
        );
      })
    );

    loginAsTestUser();
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await screen.findByText("Product Manager Resume");

    const file = new File(["%PDF-1.4 fake pdf content"], "resume.pdf", { type: "application/pdf" });
    await user.upload(screen.getByTestId("pdf-import-input"), file);

    expect(await screen.findByText(/couldn't extract readable text/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
