import assert from "node:assert/strict";
import test from "node:test";
import { type ReconciliationClock, ReconciliationScheduler } from "./reconciliation-scheduler.ts";

type ScheduledCallback = Readonly<{ callback: () => void; dueAt: number }>;

class FakeClock implements ReconciliationClock<number> {
  private callbacks = new Map<number, ScheduledCallback>();
  private currentTime = 0;
  private nextId = 1;

  clearTimer(timer: number): void {
    this.callbacks.delete(timer);
  }

  now(): number {
    return this.currentTime;
  }

  setTimer(callback: () => void, delayMs: number): number {
    const id = this.nextId;
    this.nextId += 1;
    this.callbacks.set(id, { callback, dueAt: this.currentTime + delayMs });
    return id;
  }

  advance(delayMs: number): void {
    this.currentTime += delayMs;
    const due = [...this.callbacks.entries()]
      .filter(([, scheduled]) => scheduled.dueAt <= this.currentTime)
      .sort((left, right) => left[1].dueAt - right[1].dueAt);
    for (const [id, scheduled] of due) {
      if (!this.callbacks.delete(id)) continue;
      scheduled.callback();
    }
  }
}

test("ReconciliationScheduler coalesces a quiet burst", () => {
  const clock = new FakeClock();
  let runs = 0;
  const scheduler = new ReconciliationScheduler({
    clock,
    delayMs: 1_000,
    maxWaitMs: 5_000,
    run: () => {
      runs += 1;
    },
  });

  scheduler.schedule();
  clock.advance(600);
  scheduler.schedule();
  clock.advance(999);
  assert.equal(runs, 0);
  clock.advance(1);
  assert.equal(runs, 1);
});

test("ReconciliationScheduler enforces a maximum wait during continuous activity", () => {
  const clock = new FakeClock();
  let runs = 0;
  const scheduler = new ReconciliationScheduler({
    clock,
    delayMs: 1_000,
    maxWaitMs: 3_000,
    run: () => {
      runs += 1;
    },
  });

  scheduler.schedule();
  clock.advance(800);
  scheduler.schedule();
  clock.advance(800);
  scheduler.schedule();
  clock.advance(800);
  scheduler.schedule();
  clock.advance(599);
  assert.equal(runs, 0);
  clock.advance(1);
  assert.equal(runs, 1);
});

test("ReconciliationScheduler cancels pending work", () => {
  const clock = new FakeClock();
  let runs = 0;
  const scheduler = new ReconciliationScheduler({
    clock,
    delayMs: 100,
    maxWaitMs: 500,
    run: () => {
      runs += 1;
    },
  });

  scheduler.schedule();
  scheduler.cancel();
  clock.advance(500);
  assert.equal(runs, 0);
});
