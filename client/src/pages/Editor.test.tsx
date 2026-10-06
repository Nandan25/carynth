import { describe, it, expect } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import Editor from "./Editor";
import { renderWithProviders } from "../test/testUtils";
import { server } from "../test/server";
import { sampleResume } from "../test/handlers";

function renderEditor() {
  return renderWithProviders(
    <Routes>
      <Route path="/editor/:id" element={<Editor />} />
    </Routes>,
    { route: "/editor/resume-1" }
  );
}

describe("Editor page", () => {
  it("loads the resume and renders it with its saved template", async () => {
    renderEditor();
    const preview = await screen.findByTestId("resume-preview");
    expect(preview).toHaveAttribute("data-template", "classic");
  });

  // Regression: `setTemplate: string` in the store destructuring renamed the
  // function to a local called `string`, so changing the dropdown threw
  // "setTemplate is not a function" and the preview never changed.
  it("switches the preview template when the dropdown changes", async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "modern");
    expect(preview).toHaveAttribute("data-template", "modern");

    await user.selectOptions(screen.getByRole("combobox"), "technical");
    expect(preview).toHaveAttribute("data-template", "technical");
  });

  it("autosaves after a change and sends the new template to the API", async () => {
    let savedBody: any = null;
    server.use(
      http.put("*/api/resumes/:id", async ({ request }) => {
        savedBody = await request.json();
        return HttpResponse.json(savedBody);
      })
    );

    const user = userEvent.setup();
    renderEditor();
    await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "minimal");
    expect(await screen.findByText(/unsaved changes/i)).toBeInTheDocument();

    await waitFor(() => expect(savedBody).not.toBeNull(), { timeout: 3000 });
    expect(savedBody.templateId).toBe("minimal");
    await waitFor(() => expect(screen.getByText(/all changes saved/i)).toBeInTheDocument());
  });
});

describe("Editor: loading failures", () => {
  it("shows a clear message and a way out when the resume doesn't exist (instead of loading forever)", async () => {
    server.use(
      http.get("*/api/resumes/:id", () => HttpResponse.json({ message: "Resume not found" }, { status: 404 }))
    );
    renderEditor();

    expect(await screen.findByText(/couldn't find that resume/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText(/^loading/i)).not.toBeInTheDocument();
  });

  it("treats a malformed id (400) the same way", async () => {
    server.use(http.get("*/api/resumes/:id", () => HttpResponse.json({ message: "Invalid id" }, { status: 400 })));
    renderEditor();
    expect(await screen.findByText(/couldn't find that resume/i)).toBeInTheDocument();
  });

  it("offers a retry after a network failure, and recovers when it works", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/resumes/:id", ({ params }) => {
        calls++;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json({ ...sampleResume, _id: params.id });
      })
    );
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByText(/couldn't load this resume/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("resume-preview")).toBeInTheDocument();
  });
});

describe("Editor: autosave reliability", () => {
  // Regression: a save that was still in flight when the user made another
  // edit used to mark the document "saved" on completion, which also cancelled
  // the pending save for the newer edit, so that edit was never sent.
  it("still saves an edit made while an earlier save is in flight", async () => {
    const bodies: any[] = [];
    server.use(
      http.put("*/api/resumes/:id", async ({ request }) => {
        const body = await request.json();
        bodies.push(body);
        if (bodies.length === 1) await delay(500); // first save is slow
        return HttpResponse.json(body);
      })
    );
    const user = userEvent.setup();
    renderEditor();
    await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "modern");
    await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 }); // first save now in flight
    await user.selectOptions(screen.getByRole("combobox"), "technical"); // edit during the save

    await waitFor(() => expect(bodies).toHaveLength(2), { timeout: 4000 });
    expect(bodies[1].templateId).toBe("technical");
    await waitFor(() => expect(screen.getByText(/all changes saved/i)).toBeInTheDocument(), { timeout: 3000 });
  }, 12000);

  it("tells the user a save failed and retries on its own after a server error", async () => {
    let puts = 0;
    server.use(
      http.put("*/api/resumes/:id", async ({ request }) => {
        puts++;
        const body = await request.json();
        return puts === 1 ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json(body);
      })
    );
    const user = userEvent.setup();
    renderEditor();
    await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "minimal");

    expect(await screen.findByText(/couldn't save, retrying/i, {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/all changes saved/i)).toBeInTheDocument(), { timeout: 9000 });
    expect(puts).toBe(2);
  }, 15000);

  it("explains a rejected change (4xx) without retrying forever", async () => {
    server.use(
      http.put("*/api/resumes/:id", () => HttpResponse.json({ message: "Invalid request body" }, { status: 400 }))
    );
    const user = userEvent.setup();
    renderEditor();
    await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "minimal");

    expect(await screen.findByText(/couldn't save: invalid request body/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument();
  });

  it("flushes pending edits immediately when the user leaves the editor", async () => {
    const bodies: any[] = [];
    server.use(
      http.put("*/api/resumes/:id", async ({ request }) => {
        const body = await request.json();
        bodies.push(body);
        return HttpResponse.json(body);
      })
    );
    const user = userEvent.setup();
    const { unmount } = renderEditor();
    await screen.findByTestId("resume-preview");

    await user.selectOptions(screen.getByRole("combobox"), "technical");
    unmount(); // well inside the 900 ms debounce

    await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 700 });
    expect(bodies[0].templateId).toBe("technical");
  });

  it("asks the browser to confirm before closing the tab with unsaved changes", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByTestId("resume-preview");

    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    await user.selectOptions(screen.getByRole("combobox"), "modern");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
