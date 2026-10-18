export type SaveState = "saved" | "pending";

export class SaveController {
  private savedSnapshot = "";
  private current = "";
  private inflight = false;
  private failed = false;
  private token = 0;

  reset(snapshot: string): void {
    this.savedSnapshot = snapshot;
    this.current = snapshot;
    this.inflight = false;
    this.failed = false;
    this.token += 1;
  }

  noteChange(snapshot: string): void {
    this.current = snapshot;
  }

  beginSave(): number {
    this.inflight = true;
    this.token += 1;
    return this.token;
  }

  finishSave(token: number, snapshot: string): void {
    if (token !== this.token) return;
    this.inflight = false;
    this.failed = false;
    this.savedSnapshot = snapshot;
  }

  failSave(token: number): void {
    if (token !== this.token) return;
    this.inflight = false;
    this.failed = true;
  }

  get snapshot(): string {
    return this.current;
  }

  status(): SaveState {
    if (this.inflight || this.failed || this.current !== this.savedSnapshot) return "pending";
    return "saved";
  }
}

export function createSaveQueue(
  controller: SaveController,
  write: (snapshot: string) => Promise<void>,
  onStatus: (status: SaveState) => void,
): { note: (snapshot: string) => void; flush: () => Promise<boolean> } {
  let lock: Promise<unknown> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persistNow = (): Promise<boolean> => {
    const run = lock.then(async () => {
      let guard = 0;
      while (controller.status() === "pending" && guard < 20) {
        guard += 1;
        const snapshot = controller.snapshot;
        const token = controller.beginSave();
        onStatus(controller.status());
        try {
          await write(snapshot);
          controller.finishSave(token, snapshot);
        } catch (error) {
          controller.failSave(token);
          onStatus(controller.status());
          throw error;
        }
        onStatus(controller.status());
      }
      return controller.status() === "saved";
    });
    lock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  return {
    note(snapshot: string) {
      controller.noteChange(snapshot);
      onStatus(controller.status());
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void persistNow();
      }, 400);
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return persistNow();
    },
  };
}
