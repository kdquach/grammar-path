export interface UnauthorizedEventDetail {
  endpoint?: string;
  message?: string;
}

type UnauthorizedListener = (detail: UnauthorizedEventDetail) => void;

const listeners = new Set<UnauthorizedListener>();

export function emitUnauthorized(detail: UnauthorizedEventDetail = {}): void {
  listeners.forEach((listener) => {
    try {
      listener(detail);
    } catch {
      // Prevent one failing listener from breaking notification fan-out
    }
  });
}

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

