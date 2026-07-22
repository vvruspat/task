export type LatestRequestHandle<Selector, Value> = Readonly<{
  generation: number;
  promise: Promise<Value>;
  selector: Selector;
  signal: AbortSignal;
}>;

type PendingRequest<Selector, Value> = LatestRequestHandle<Selector, Value> & {
  controller: AbortController;
};

export class LatestRequestCoordinator<Selector, Value> {
  private generation = 0;
  private latestGeneration = 0;
  private pending: PendingRequest<Selector, Value> | null = null;

  request(
    selector: Selector,
    load: (signal: AbortSignal) => Promise<Value>,
  ): LatestRequestHandle<Selector, Value> {
    if (this.pending !== null && Object.is(this.pending.selector, selector)) return this.pending;

    this.pending?.controller.abort();
    const controller = new AbortController();
    const generation = this.generation + 1;
    this.generation = generation;
    this.latestGeneration = generation;
    const promise = load(controller.signal);
    const request: PendingRequest<Selector, Value> = {
      controller,
      generation,
      promise,
      selector,
      signal: controller.signal,
    };
    this.pending = request;
    void promise.then(
      () => this.clearPending(request),
      () => this.clearPending(request),
    );
    return request;
  }

  isLatest(request: LatestRequestHandle<Selector, Value>): boolean {
    return request.generation === this.latestGeneration;
  }

  cancel(): void {
    this.pending?.controller.abort();
    this.pending = null;
    this.generation += 1;
    this.latestGeneration = this.generation;
  }

  private clearPending(request: PendingRequest<Selector, Value>): void {
    if (this.pending?.generation === request.generation) this.pending = null;
  }
}
