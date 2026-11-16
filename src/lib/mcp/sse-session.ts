type SseController = ReadableStreamDefaultController<Uint8Array>;

export interface SseSession {
  id: string;
  controller: SseController;
  createdAt: number;
}

const globalForMcpSse = globalThis as unknown as {
  mcpSseSessions?: Map<string, SseSession>;
};

export const mcpSseSessions =
  globalForMcpSse.mcpSseSessions || new Map<string, SseSession>();

if (process.env.NODE_ENV !== "production") {
  globalForMcpSse.mcpSseSessions = mcpSseSessions;
}

export function registerSseSession(id: string, controller: SseController): void {
  mcpSseSessions.set(id, { id, controller, createdAt: Date.now() });
}

export function removeSseSession(id: string): void {
  mcpSseSessions.delete(id);
}

export function sendSseEvent(
  sessionId: string,
  event: string,
  data: string
): boolean {
  const session = mcpSseSessions.get(sessionId);
  if (!session) return false;

  try {
    const encoder = new TextEncoder();
    const payload = `event: ${event}\ndata: ${data}\n\n`;
    session.controller.enqueue(encoder.encode(payload));
    return true;
  } catch {
    removeSseSession(sessionId);
    return false;
  }
}
