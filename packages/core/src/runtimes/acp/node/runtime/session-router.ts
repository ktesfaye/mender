import type {
  CreateElicitationRequest,
  CreateElicitationResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type { Logger } from '@emdash/shared/logger';
import type { NormalizedEvent } from '#runtimes/acp/api';
import type { InboundRouter } from '#runtimes/acp/node/agent-ports/agent-client';
import type { AcpConnectionContext } from '#runtimes/acp/node/connection/source';

export interface SessionRouteTarget {
  onSessionUpdate(
    conversationId: string,
    connection: AcpConnectionContext,
    params: SessionNotification,
    event: NormalizedEvent
  ): void;
  onPermissionRequest(
    conversationId: string,
    connection: AcpConnectionContext,
    params: RequestPermissionRequest
  ): Promise<RequestPermissionResponse>;
  onElicitation(
    conversationId: string,
    params: CreateElicitationRequest
  ): Promise<CreateElicitationResponse>;
  onCreateTerminal(
    conversationId: string,
    connection: AcpConnectionContext,
    params: CreateTerminalRequest
  ): Promise<CreateTerminalResponse>;
}

export class SessionRouter implements InboundRouter {
  private readonly routes = new Map<string, Map<string, string>>();
  private readonly loadingConversationByOwner = new Map<string, string>();
  /* An agent may announce itself in the same breath as it answers session/new,
     the Claude adapter's command list among them, so an update can land a moment
     before the session's route is registered. Held by owner and session, and
     delivered when the route appears, rather than dropped for good. */
  private readonly early = new Map<
    string,
    { connection: AcpConnectionContext; params: SessionNotification; event: NormalizedEvent }[]
  >();

  constructor(
    private readonly target: SessionRouteTarget,
    private readonly logger: Logger
  ) {}

  onSessionUpdate(
    connection: AcpConnectionContext,
    params: SessionNotification,
    event: NormalizedEvent
  ): void {
    const processOwner = routeOwnerId(connection.key, connection.generation);
    const conversationId = this.resolveConversationForSession(processOwner, params.sessionId);
    if (!conversationId) {
      const key = `${processOwner}\n${params.sessionId}`;
      const held = this.early.get(key) ?? [];
      if (held.length < 32) held.push({ connection, params, event });
      this.early.set(key, held);
      if (this.early.size > 64) this.early.delete(this.early.keys().next().value as string);
      return;
    }
    this.target.onSessionUpdate(conversationId, connection, params, event);
  }

  onPermissionRequest(
    connection: AcpConnectionContext,
    params: RequestPermissionRequest
  ): Promise<RequestPermissionResponse> {
    const conversationId = this.resolveConversationForSession(
      routeOwnerId(connection.key, connection.generation),
      params.sessionId
    );
    if (!conversationId) return Promise.resolve({ outcome: { outcome: 'cancelled' } });
    return this.target.onPermissionRequest(conversationId, connection, params);
  }

  onElicitation(
    connection: AcpConnectionContext,
    params: CreateElicitationRequest
  ): Promise<CreateElicitationResponse> {
    /* Only a form tied to a session can be put in front of anybody; a request
       scoped to nothing has no board to stand on. */
    const sessionId = 'sessionId' in params ? params.sessionId : undefined;
    const conversationId = sessionId
      ? this.resolveConversationForSession(
          routeOwnerId(connection.key, connection.generation),
          sessionId
        )
      : null;
    if (!conversationId) return Promise.resolve({ action: 'cancel' });
    return this.target.onElicitation(conversationId, params);
  }

  onCreateTerminal(
    connection: AcpConnectionContext,
    params: CreateTerminalRequest
  ): Promise<CreateTerminalResponse> {
    const conversationId = this.resolveConversationForSession(
      routeOwnerId(connection.key, connection.generation),
      params.sessionId
    );
    if (!conversationId) {
      throw new Error(`SessionManager: no conversation for ACP sessionId ${params.sessionId}`);
    }
    return this.target.onCreateTerminal(conversationId, connection, params);
  }

  register(processOwner: string, acpSessionId: string, conversationId: string): void {
    let bySession = this.routes.get(processOwner);
    if (!bySession) {
      bySession = new Map();
      this.routes.set(processOwner, bySession);
    }
    bySession.set(acpSessionId, conversationId);
    const key = `${processOwner}\n${acpSessionId}`;
    const held = this.early.get(key);
    if (held) {
      this.early.delete(key);
      setTimeout(() => {
        for (const one of held) {
          this.target.onSessionUpdate(conversationId, one.connection, one.params, one.event);
        }
      }, 0);
    }
  }

  unregister(processOwner: string, conversationId: string): void {
    const bySession = this.routes.get(processOwner);
    if (!bySession) return;
    for (const [sessionId, mappedConversationId] of bySession) {
      if (mappedConversationId === conversationId) bySession.delete(sessionId);
    }
    if (bySession.size === 0) this.routes.delete(processOwner);
  }

  beginLoad(processOwner: string, acpSessionId: string, conversationId: string): () => void {
    if (this.loadingConversationByOwner.has(processOwner)) {
      throw new Error(`SessionManager: ACP load already active for process owner ${processOwner}`);
    }
    this.loadingConversationByOwner.set(processOwner, conversationId);
    this.register(processOwner, acpSessionId, conversationId);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      if (this.loadingConversationByOwner.get(processOwner) === conversationId) {
        this.loadingConversationByOwner.delete(processOwner);
      }
    };
  }

  hasRoutesFor(conversationId: string): boolean {
    for (const bySession of this.routes.values()) {
      if ([...bySession.values()].includes(conversationId)) return true;
    }
    return false;
  }

  isLoadingConversation(conversationId: string): boolean {
    return [...this.loadingConversationByOwner.values()].includes(conversationId);
  }

  invalidate(processOwner: string): void {
    for (const key of [...this.early.keys()]) if (key.startsWith(`${processOwner}\n`)) this.early.delete(key);
    this.routes.delete(processOwner);
    this.loadingConversationByOwner.delete(processOwner);
  }

  private resolveConversationForSession(processOwner: string, acpSessionId: string): string | null {
    const route = this.routes.get(processOwner)?.get(acpSessionId);
    if (route) return route;
    const pending = this.loadingConversationByOwner.get(processOwner);
    if (!pending) return null;
    this.register(processOwner, acpSessionId, pending);
    return pending;
  }
}

export function routeOwnerId(key: string, generation: number): string {
  return `${key}:${generation}`;
}
