/**
 * Server health state hook & listener
 * Allows UI elements (buttons, links) to start in disabled/protected state
 * until server health check confirms the backend is healthy.
 */
import { useEffect, useState } from 'react';

// Start as true (OFF/disabled initially) until first health check passes
let globalServerDown = true;
let hasCheckedInitialHealth = false;
const listeners = new Set<(isDown: boolean) => void>();

export function setServerDownState(isDown: boolean) {
  hasCheckedInitialHealth = true;
  if (globalServerDown !== isDown) {
    globalServerDown = isDown;
    listeners.forEach((listener) => listener(isDown));
  }
}

export function isBackendDown(): boolean {
  return globalServerDown;
}

export function hasInitialHealthCheckCompleted(): boolean {
  return hasCheckedInitialHealth;
}

export function useServerDown(): boolean {
  const [down, setDown] = useState(globalServerDown);

  useEffect(() => {
    const handler = (isDown: boolean) => setDown(isDown);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return down;
}
