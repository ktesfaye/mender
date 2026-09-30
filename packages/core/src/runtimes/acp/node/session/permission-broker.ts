import type {
  CreateElicitationResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { AcpPermissionRequest, ElicitationAnswer } from '#runtimes/acp/api';

type Resolver =
  | { kind: 'permission'; resolve: (response: RequestPermissionResponse) => void }
  | { kind: 'form'; resolve: (response: CreateElicitationResponse) => void };

export class PermissionBroker {
  private readonly resolvers = new Map<string, Resolver>();

  request(request: AcpPermissionRequest): Promise<RequestPermissionResponse> {
    return new Promise<RequestPermissionResponse>((resolve) => {
      this.resolvers.set(request.requestId, { kind: 'permission', resolve });
    });
  }

  /** A form waits in the same queue as a permission, since either stops the turn. */
  requestForm(request: AcpPermissionRequest): Promise<CreateElicitationResponse> {
    return new Promise<CreateElicitationResponse>((resolve) => {
      this.resolvers.set(request.requestId, { kind: 'form', resolve });
    });
  }

  settle(requestId: string, optionId: string): boolean {
    const resolver = this.resolvers.get(requestId);
    if (resolver?.kind !== 'permission') return false;
    this.resolvers.delete(requestId);
    resolver.resolve({ outcome: { outcome: 'selected', optionId } });
    return true;
  }

  settleForm(answer: ElicitationAnswer): boolean {
    const resolver = this.resolvers.get(answer.requestId);
    if (resolver?.kind !== 'form') return false;
    this.resolvers.delete(answer.requestId);
    resolver.resolve(
      answer.action === 'accept'
        ? { action: 'accept', content: answer.content ?? {} }
        : { action: answer.action }
    );
    return true;
  }

  cancel(requestId: string): boolean {
    const resolver = this.resolvers.get(requestId);
    if (!resolver) return false;
    this.resolvers.delete(requestId);
    if (resolver.kind === 'form') resolver.resolve({ action: 'cancel' });
    else resolver.resolve({ outcome: { outcome: 'cancelled' } });
    return true;
  }

  drain(requests: readonly AcpPermissionRequest[]): void {
    for (const request of requests) {
      this.cancel(request.requestId);
    }
  }
}
