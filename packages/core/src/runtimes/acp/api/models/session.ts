import { z } from 'zod';
import { acpPermissionRequestSchema } from './permissions';
import { queuedPromptSchema } from './prompt';

export const stopReasonSchema = z.enum([
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
]);
export type StopReason = z.infer<typeof stopReasonSchema>;

/**
 * A typed session failure, as Claude's own ACP adapter reports it (its "AIR"
 * `sessionFailure` extension) rather than as ordinary transcript prose: a
 * usage/rate limit, an overload, an empty quota, sign-in being required, a
 * lost connection, or the like, each with what it's asking you to do about it.
 */
export const sessionFailureCategorySchema = z.enum([
  'connection',
  'access',
  'limit',
  'request',
  'service',
  'unknown',
]);
export type SessionFailureCategory = z.infer<typeof sessionFailureCategorySchema>;

export const sessionFailureActionSchema = z.enum(['retry', 'login', 'new_session']);
export type SessionFailureAction = z.infer<typeof sessionFailureActionSchema>;

export const sessionFailureSchema = z.object({
  id: z.string(),
  category: sessionFailureCategorySchema,
  severity: z.enum(['warning', 'error']),
  title: z.string(),
  /** The agent's own prose, when it carried more than the title — kept because
   *  its wording is sometimes the only place a reset time is said at all. */
  details: z.string().optional(),
  actions: z.array(sessionFailureActionSchema),
  /** Epoch ms, pulled out of `details` when it names a reset time. */
  resetAt: z.number().optional(),
});
export type SessionFailure = z.infer<typeof sessionFailureSchema>;

/**
 * ACP session lifecycle owned by the SessionMachine.
 *
 * - `starting`: agent process/session setup is in progress.
 * - `replaying`: an existing ACP session is loading historical updates.
 * - `ready`: no foreground work is active; a prompt can start immediately.
 * - `working`: a foreground user prompt turn is running.
 * - `cancelling`: cancellation was requested; waiting for agent settlement.
 * - `closed`: runtime session is no longer usable.
 */
export const sessionLifecycleSchema = z.enum([
  'starting',
  'replaying',
  'ready',
  'working',
  'cancelling',
  'closed',
]);
export type SessionLifecycle = z.infer<typeof sessionLifecycleSchema>;

export const sessionStateSchema = z.object({
  lifecycle: sessionLifecycleSchema,
  /** Present and true when the conversation is retained without a live provider session. */
  suspended: z.literal(true).optional(),
  /** Current control-plane turn id, or null when no prompt/replay turn is active. */
  activeTurnId: z.string().nullable(),
  /** Activation-local revision of amendments to committed turns, independent of foreground work. */
  historyRevision: z.number().int().nonnegative().optional(),
  pendingPermissions: z.array(acpPermissionRequestSchema),
  /** Last ACP prompt stop reason observed by the machine; separate from transcript outcomes. */
  lastStopReason: stopReasonSchema.nullable(),
  /** True when the last turn failed without producing an ACP stop reason. */
  lastTurnErrored: z.boolean(),
  /** Prompts accepted while busy; attachments are references, never inline bytes. */
  queuedPrompts: z.array(queuedPromptSchema),
  /** True while agent-originated updates are still arriving outside a user prompt turn. */
  agentTurnActive: z.boolean(),
  /** Count of running background subagents, used for affordances and busy state. */
  backgroundAgentCount: z.number().int(),
  /** Machine-owned UI affordance: true while foreground or background work is active. */
  isGenerating: z.boolean(),
  /** Machine-owned UI affordance: true when a prompt may be accepted or queued. */
  canSubmit: z.boolean(),
  /** Machine-owned UI affordance: true when there is cancellable foreground/agent work. */
  canCancel: z.boolean(),
  /** The most recent typed failure the agent has reported, cleared the moment
   *  a new prompt is sent. Optional so existing session-state literals built
   *  before this field existed stay valid. */
  failure: sessionFailureSchema.nullable().optional(),
});
export type SessionState = z.infer<typeof sessionStateSchema>;

export const sessionSummarySchema = z.object({
  conversationId: z.string(),
  providerId: z.string(),
  cwd: z.string().optional(),
  lifecycle: sessionLifecycleSchema,
  /** Present and true when the conversation is retained without a live provider session. */
  suspended: z.literal(true).optional(),
  isGenerating: z.boolean(),
  lastStopReason: stopReasonSchema.nullable(),
  lastTurnErrored: z.boolean(),
  pendingPermissionCount: z.number().int(),
  backgroundAgentCount: z.number().int(),
  queuedPromptCount: z.number().int(),
  title: z.string().nullable(),
  updatedAt: z.number(),
  lastInputAt: z.number().int().optional(),
  lastOutputAt: z.number().int().optional(),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
