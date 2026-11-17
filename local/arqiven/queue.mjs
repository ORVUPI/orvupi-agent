/** Una sola inferencia a la vez. El resto espera y se puede cancelar sin ocupar el hueco. */

const WAIT_LIMIT = 8;

export function createQueue(limit = 1) {
  if (limit !== 1) throw Object.assign(new Error("concurrency"), { code: "bad-request" });
  let active = 0;
  /** @type {Array<{ requestId: string, resolve: () => void, reject: (error: Error) => void }>} */
  const waiters = [];

  function snapshot() {
    return { active, waiting: waiters.map((item) => item.requestId) };
  }

  function acquire(requestId, onQueued) {
    if (active < 1) {
      active += 1;
      return Promise.resolve({ queued: false, position: 0 });
    }
    if (waiters.length >= WAIT_LIMIT) {
      return Promise.reject(Object.assign(new Error("queue-full"), { code: "queue-full" }));
    }
    const position = waiters.length + 1;
    onQueued?.({ position, status: "en espera" });
    return new Promise((resolve, reject) => {
      waiters.push({
        requestId,
        resolve: () => resolve({ queued: true, position }),
        reject,
      });
    });
  }

  function release() {
    const next = waiters.shift();
    if (next) next.resolve();
    else active = Math.max(0, active - 1);
  }

  function cancel(requestId) {
    const index = waiters.findIndex((item) => item.requestId === requestId);
    if (index < 0) return false;
    const [item] = waiters.splice(index, 1);
    item.reject(Object.assign(new Error("cancelled"), { code: "cancelled" }));
    return true;
  }

  return { acquire, release, cancel, snapshot, limit: 1 };
}
