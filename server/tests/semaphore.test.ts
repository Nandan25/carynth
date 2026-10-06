import { describe, it, expect } from "vitest";
import { Semaphore, ServerBusyError } from "../utils/semaphore.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Semaphore", () => {
  it("never runs more than `max` jobs at once", async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let peak = 0;
    const job = async () => {
      running++;
      peak = Math.max(peak, running);
      await sleep(10);
      running--;
    };

    await Promise.all(Array.from({ length: 8 }, () => sem.run(job)));

    expect(peak).toBe(2);
    expect(sem.stats).toEqual({ active: 0, queued: 0 });
  });

  it("runs queued jobs in first-in-first-out order", async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];
    await Promise.all([1, 2, 3, 4].map((n) => sem.run(async () => { await sleep(5); order.push(n); })));
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("rejects with a 503 once the waiting line is full", async () => {
    const sem = new Semaphore(1, 2); // 1 running + 2 waiting
    const jobs = Array.from({ length: 4 }, () => sem.run(() => sleep(20)));
    const results = await Promise.allSettled(jobs);

    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ServerBusyError);
    expect(rejected[0].reason.status).toBe(503);
  });

  it("frees the slot when a job throws", async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(sem.run(async () => "ok")).resolves.toBe("ok");
    expect(sem.stats.active).toBe(0);
  });

  it("returns the job's result", async () => {
    await expect(new Semaphore(1).run(async () => 42)).resolves.toBe(42);
  });
});
