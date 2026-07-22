export type ReconciliationClock<TimerHandle> = Readonly<{
  clearTimer: (timer: TimerHandle) => void;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
}>;

export type ReconciliationSchedulerOptions<TimerHandle> = Readonly<{
  clock: ReconciliationClock<TimerHandle>;
  delayMs: number;
  maxWaitMs: number;
  run: () => void;
}>;

export class ReconciliationScheduler<TimerHandle> {
  private readonly clock: ReconciliationClock<TimerHandle>;
  private readonly delayMs: number;
  private readonly maxWaitMs: number;
  private readonly runReconciliation: () => void;
  private firstScheduledAt: number | null = null;
  private timer: TimerHandle | null = null;

  constructor(options: ReconciliationSchedulerOptions<TimerHandle>) {
    if (options.delayMs < 0 || options.maxWaitMs <= 0) {
      throw new Error("Reconciliation delays must be positive.");
    }
    this.clock = options.clock;
    this.delayMs = options.delayMs;
    this.maxWaitMs = options.maxWaitMs;
    this.runReconciliation = options.run;
  }

  schedule(): void {
    const now = this.clock.now();
    this.firstScheduledAt ??= now;
    if (this.timer !== null) this.clock.clearTimer(this.timer);
    const remainingMaxWait = Math.max(0, this.maxWaitMs - (now - this.firstScheduledAt));
    this.timer = this.clock.setTimer(() => this.flush(), Math.min(this.delayMs, remainingMaxWait));
  }

  cancel(): void {
    if (this.timer !== null) this.clock.clearTimer(this.timer);
    this.timer = null;
    this.firstScheduledAt = null;
  }

  flush(): void {
    if (this.timer === null && this.firstScheduledAt === null) return;
    if (this.timer !== null) this.clock.clearTimer(this.timer);
    this.timer = null;
    this.firstScheduledAt = null;
    this.runReconciliation();
  }
}
