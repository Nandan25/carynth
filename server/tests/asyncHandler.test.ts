import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "../utils/asyncHandler.js";

describe("asyncHandler", () => {
  it("forwards a rejected promise to next() instead of leaving it unhandled", async () => {
    const boom = new Error("boom");
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw boom;
    });

    handler({} as any, {} as any, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledWith(boom);
  });

  it("forwards synchronous throws too", () => {
    const boom = new Error("sync boom");
    const next = vi.fn();
    const handler = asyncHandler(() => {
      throw boom;
    });

    expect(() => handler({} as any, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalledWith(boom);
  });

  it("does not call next() when the handler succeeds", async () => {
    const next = vi.fn();
    const handler = asyncHandler(async (_req, res: any) => res.send("ok"));
    const res = { send: vi.fn() };

    handler({} as any, res as any, next);
    await new Promise((r) => setImmediate(r));

    expect(res.send).toHaveBeenCalledWith("ok");
    expect(next).not.toHaveBeenCalled();
  });
});
