import assert from "node:assert/strict";
import test from "node:test";
import { LatestRequestCoordinator } from "./latest-request.ts";

type Deferred<Value> = Readonly<{
  promise: Promise<Value>;
  reject: (reason?: unknown) => void;
  resolve: (value: Value) => void;
}>;

function deferred<Value>(): Deferred<Value> {
  let resolvePromise: ((value: Value) => void) | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    reject(reason?: unknown): void {
      rejectPromise?.(reason);
    },
    resolve(value: Value): void {
      resolvePromise?.(value);
    },
  };
}

test("LatestRequestCoordinator reuses an in-flight request for the same selector", async () => {
  const coordinator = new LatestRequestCoordinator<string | null, string>();
  const result = deferred<string>();
  let calls = 0;
  const first = coordinator.request("workspace-a", () => {
    calls += 1;
    return result.promise;
  });
  const second = coordinator.request("workspace-a", () => {
    calls += 1;
    return Promise.resolve("unexpected");
  });

  assert.equal(calls, 1);
  assert.equal(first.promise, second.promise);
  assert.equal(first.generation, second.generation);
  result.resolve("workspace-a");
  assert.equal(await second.promise, "workspace-a");
  assert.equal(coordinator.isLatest(first), true);
});

test("LatestRequestCoordinator prevents an older selector from winning", async () => {
  const coordinator = new LatestRequestCoordinator<string | null, string>();
  const workspaceA = deferred<string>();
  const workspaceB = deferred<string>();
  const commits: string[] = [];
  const first = coordinator.request("workspace-a", () => workspaceA.promise);
  const second = coordinator.request("workspace-b", () => workspaceB.promise);

  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, false);
  workspaceB.resolve("workspace-b");
  const secondValue = await second.promise;
  if (coordinator.isLatest(second)) commits.push(secondValue);
  workspaceA.resolve("workspace-a");
  const firstValue = await first.promise;
  if (coordinator.isLatest(first)) commits.push(firstValue);

  assert.deepEqual(commits, ["workspace-b"]);
});

test("LatestRequestCoordinator invalidates pending work when cancelled", async () => {
  const coordinator = new LatestRequestCoordinator<string | null, string>();
  const result = deferred<string>();
  const request = coordinator.request(null, () => result.promise);

  coordinator.cancel();
  assert.equal(request.signal.aborted, true);
  result.resolve("default-workspace");
  await request.promise;
  assert.equal(coordinator.isLatest(request), false);
});
