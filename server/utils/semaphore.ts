/** Thrown when too many jobs are already waiting; maps to HTTP 503. */
export class ServerBusyError extends Error {
  status = 503;
  constructor() {
    super("The server is busy right now. Please try again in a moment.");
    this.name = "ServerBusyError";
  }
}

/**
 * Runs at most `max` jobs at a time and lets at most `maxQueue` more wait in
 * line; beyond that, callers are rejected immediately instead of piling up
 * memory behind a slow job. Used to protect the small server from running
 * many Chromium pages / OCR jobs at once.
 */
export class Semaphore {
  private active = 0;
  private waiting: Array<() => void> = [];

  constructor(
    private readonly max: number,
    private readonly maxQueue: number = Infinity
  ) {}

  get stats() {
    return { active: this.active, queued: this.waiting.length };
  }

  async run<T>(job: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await job();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    if (this.waiting.length >= this.maxQueue) {
      return Promise.reject(new ServerBusyError());
    }
    // The slot is handed over directly by release(), so `active` is unchanged.
    return new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}
