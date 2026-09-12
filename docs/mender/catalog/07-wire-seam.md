## 1. Is there a single well-defined API surface, or is it scattered? Name it.

**There is a single, named mechanism (`@emdash/wire`), but the surface it carries is not one object — it is an assembly of ~39 independent domain contracts, each owned by a different feature.** Whether that reads as "well-defined" depends on which layer you look at.

The mechanism itself is disciplined and well-documented (`packages/wire/`, docs at `packages/wire/docs/README.md`):

- A contract is declared once with `defineContract({...})` (`packages/wire/src/api/define.ts`), built from typed endpoint kinds: `procedure`, `fallible`, `mutation`, `liveLog`, `eventStream`, `liveJob`, `downloadFile`, `uploadFile`, `liveModel`/`liveState` (`packages/wire/src/api/endpoint-kinds.ts`, `packages/wire/docs/api/contracts.md`).
- A `Controller` implements it server-side (`createController(contract, impl)`), a `ContractClient` consumes it client-side (`client(contract, connection)`), and both are typed off the same contract object — "Controller creation and client creation derive their types from the same object" (`docs/api/contracts.md`).
- Contracts nest (`defineContract({ ptyAgent })`), and object-key nesting determines the wire path/topic id, so small contracts compose into bigger ones without a namespace argument.

But the app does not expose one canonical contract for the whole product. In `apps/emdash-desktop`:

- `apps/emdash-desktop/src/core/manifests/shared/domain-contracts.ts` assembles **39** feature contracts into one object, `desktopDomainContracts`, keyed by domain string (`agents`, `conversations`, `files`, `terminals`, `github`, `workspaces`, `machines`, `ssh`, `hosts`, `pull-requests`, `automations`, `browser`, `mcp`, `skills`, `search`, `source-control`, `catalog`, `projects`, `tasks`, `updates`, `desktop-host`, …).
- `desktopWireContract = defineContract(desktopDomainContracts)` (`core/manifests/shared/desktop-wire-contract.ts`) is the single, whole-product contract, and there is a whole-product client, `getDesktopWireClient()` (`renderer/lib/runtime/desktop-wire-client.ts`), used in a handful of places.
- **In practice almost nothing uses that whole-product client.** Every one of the 39 features instead has its own `core/features/<x>/api/browser/client.ts` that calls `domainClient<XClient>(xDomain, xContract)` (`core/primitives/wire/browser/connection.ts`) — re-wrapping just that one slice's contract under its domain key and building a lazily-cached, independent `ContractClient` for it. `domainClient` is called from 30+ separate files, one per feature; the aggregate client (`getDesktopWireClient`) is used from 9.
- On the main-process side, routing is equally decentralized: `installDesktopWire()` (`apps/emdash-desktop/src/main/gateway/desktop-wire.ts`) does not serve `desktopWireContract` directly — it installs a `createLazyRoutingController()` that takes the dotted call/topic path, splits off the first segment as a domain prefix, and dispatches to a `Record<string, Controller>` built per-domain by `bootControllers()` (`main/bootstrap/boot/phases/controllers.ts`), which iterates `desktopNodeControllers` (one controller-constructor per domain) and requires (`assertDomainKeyParity`) that its key set exactly match `desktopDomainContracts`'s key set.

So: **one transport/RPC mechanism, one process-wide message channel, but 39 independently-defined and independently-served contracts glued together only by convention (domain-prefixed paths) and one parity assertion, not by a single schema anyone reads as a whole.** A new front end has one thing to learn (wire's endpoint kinds and client shapes) but ~39 things to enumerate and reimplement UI for.

## 2. Complete list of endpoints / RPC calls / subscriptions / topics, grouped by domain

Counted directly from every `*contract*.ts` file under `apps/emdash-desktop/src/core/{features,primitives,services}/*/api` (excluding `*.test.ts`), by grepping for lines of the form `<name>: <kind>(`:

```
total endpoint entries: 449, across 51 contract files / 39 domains

by kind:
  procedure     214   (request/response)
  fallible      120   (request/response returning Result<data,error>)
  mutation       20   (live-model-scoped state mutations)
  liveModel      30   (state groups — each with N liveState sub-states)
  liveState      34   (individual reactive JSON sub-states inside liveModel groups)
  liveJob        11   (progress + cancel + terminal-state long-running jobs)
  eventStream    11   (fire-and-forget, unretained notifications)
  liveLog         4   (append-only retained text streams — terminal-style output)
  downloadFile    3
  uploadFile      2
```

This is necessarily a **representative, not exhaustive, enumeration** — 449 top-level entries is too many to hand-transcribe faithfully; the full per-file listing is reproducible with:

```
grep -nE '^\s*[A-Za-z0-9_]+:\s*(procedure|fallible|mutation|liveLog|eventStream|liveJob|downloadFile|uploadFile|liveModel|liveState)\(' <contract-file>
```

across every file found by:

```
find apps/emdash-desktop/src/core/{features,primitives,services} -path '*/api/*' -iname '*contract*.ts' ! -iname '*.test.ts'
```

Grouped by domain (source file in parentheses), naming the endpoints that matter for a canvas-game front end:

**Agents** (`core/features/agents/api/contract.ts`) — install/uninstall/update agent CLIs (`install`, `update` as `liveJob`s), settings (`getSettings`/`updateSettings`), auth flow (`startLogin`/`cancelLogin`/`sendLoginInput`/`resizeLogin` + `loginOutput: liveLog`), `auth: liveModel` (list of configured agents).

**Conversations** (`core/features/conversations/api/contract.ts`) — the central domain. CRUD (`getConversations`, `createConversation`, `deleteConversation`, `renameConversation`, `hydrateConversation`/`dehydrateConversation`, `linkConversationToTask`), `events: eventStream` (domain-wide invalidation), plus two **nested runtime contracts**:
  - `acp` (Agent Client Protocol runtime, from `@emdash/core/runtimes/acp/api/client`): `attach`, `terminate`, `sendPrompt`, `editQueuedPrompt`/`deleteQueuedPrompt`/`changeQueuePromptOrder`, `cancelTurn`, `setOption`, `resolvePermission`, `exportAcpTranscript`/`exportRawAcpLog`, `uploadAttachment`/`downloadAttachment`/`deleteAttachment`, `loadHistory`, `sessions: liveModel` (all sessions keyed by conversationId), **`session: liveModel`** — one instance per conversation with 8 live sub-states: `state`, `config`, `usage`, `plan`, `agents`, `activeTurn`, `terminals`, `mcpServers` (see Q5), and `terminalOutput: liveLog` (agent-spawned terminal bytes).
  - `tui` (raw terminal CLI agents, from `@emdash/core/runtimes/tui-agents/api`): `start`/`resume`/`stop`/`kill`/`delete`, `sendInput`, `resize`, `output: liveLog` (raw PTY bytes), `sessions: liveModel`, `agentStates: liveModel`.

**Terminals** (`core/features/terminals/api/wire-contract.ts`) — `list`/`create`/`delete`/`rename`/`hydrate`/`getShellAvailability`, `sendInput`/`resize`/`kill`, `output: liveLog`.

**Files** (`core/features/files/api/contract.ts`) — `readBytes: downloadFile`, `upload: uploadFile`, `model: liveModel` (file tree), `content: liveModel` (file content).

**Projects** (`core/features/projects/api/wire-contract.ts`) — `createProject`, `deleteProject`, path inspection, settings, `events: eventStream`, `projectList: liveModel`, `attachments: liveModel`, `projectConfig: liveModel`, `creation: liveModel`, `directoryTree: liveModel` (with `expand`/`reveal` mutations), `create: liveJob`.

**Workspaces** (4 contract files: `wire-contract.ts`, `registry-wire-contract.ts`, `project-contracts.ts`, `lifecycle-scripts-wire-contract.ts`) — `provision: liveJob`, `reprovision`/`removeAndReprovision`/`delete`/`archive`, `listWorkspaces`, `createWorkspace`/`createWorktree`, `activateWorkspace`/`deactivateWorkspace`, `deleteWorkspace`/`deleteWorktree`, `retryStep`, `workspaceGroups: liveModel`, lifecycle scripts `runs: liveModel` + `output: liveLog` + `start`/`stop`/`sendInput`/`resize`.

**Tasks** (`core/features/tasks/api/wire-contract.ts`) — `createTask`/`deleteTask`/`deleteTasks`/`teardownTask`/`generateTaskName`, `taskList: liveModel` (with `rename`/`setStatus`/`setPinned`/`setLinkedIssue`/`convertAutomation`/`archive`/`restore` mutations), `taskStats: liveModel`.

**Source control** (`core/features/source-control/api/contract.ts`) — `model: liveModel` (refs/remotes), `fetch`/`fetchPrForReview`/`push`/`publish`/`pull` as `liveJob`s, `checkout.model: liveModel` (status/head), `download: downloadFile`.

**GitHub / Pull requests / Issues / Automations** — CRUD procedures/fallibles plus `events: eventStream` (github, pull-requests via `syncState: liveModel`), `runEvents: eventStream` (automations), `getRunOverview` etc.

**Machines / SSH / Hosts** (`core/features/machines`, `core/services/ssh`, `core/services/hosts`) — remote dev-box management: `connect`/`disconnect`/`testConnection`, `connections: liveModel` (ssh, with `runtime: liveState`), `availability: liveModel` + `serverStates: liveModel` (hosts), `systemDependencies: liveModel` + `installSystemDependencies: liveJob`, `hostSettings: liveModel` (machines).

**Search** (`core/features/search/api/contract.ts`) — `searchPaletteEntities`, `searchWorkspaceFiles`, `searchWorkspaceContent: liveJob`.

**Browser** (`core/features/browser/api/contract.ts`) — embedded-browser control: `registerSession`/`bindWebContents`/`setActiveBrowser`, `captureScreenshot`, `events: eventStream`.

**MCP / Skills / Catalog / Library / Integrations / Preview servers / Editor / Legacy-port / Dev-perf / Updates / Account / Desktop-host / Logging / Mementos / Notifications / Telemetry / Settings** — each a smaller CRUD-shaped contract (2–13 endpoints), several with one `liveModel` (`mcp.servers`, `skills.installed`, `notifications.feed` with `markRead`/`markAllRead`/`dismiss` mutations + `delivery: eventStream`) and/or one `eventStream` (`updates.events`, `preview-servers.events`).

**The full inventory (449 entries) is reproducible in under a minute with the grep command above** and should be re-run rather than trusted from memory when building the new front end's endpoint list — this report samples it, it does not claim to enumerate all 449 by name.

## 3. Is the back end genuinely independent of Electron and React, or does it assume things about the UI?

**The wire package itself (`packages/wire/src`) is genuinely independent of both.** Evidence:

- `packages/wire/package.json` dependencies: `@emdash/shared`, `immer`, `zod`. `mobx` is a **peerDependency** only used by the optional `@emdash/wire/mobx` subpath export (`createImmutableMobxStore`, `createReactiveMobxStore`, `createMobxLogStore` — bridges for consumers who happen to use MobX, not required by the core).
- `grep -rli "from 'electron'" packages/wire/src` and the same for React: **zero matches.** No file in `packages/wire/src` imports `electron` or `react`.
- The one Electron-shaped transport, `packages/wire/src/api/transports/electron.ts` (`exposeWireToWindows`, `requestWirePort`/`awaitWirePort`), is **structurally typed against duck-typed interfaces** (`IpcMainLike`, `IpcRendererLike`, `WebContentsLike`, `WindowLike`, `MessagePortMainLike`) — it never imports the real `electron` module. It is one of five interchangeable transports (`memory`, `port`/`dom-port`, `electron`, `stream`, `reconnecting`), all exported from the same `./rpc` subpath, and "the same `serve()`, `connect()`, and `client()` code works across every transport. Only construction changes" (`docs/api/transports.md`).
- The reactive state kernel (`packages/wire/src/state/`, docs `01-05` + README) is framework-agnostic by design: `observe` is described as "the only side-effect edge... owned by a Scope" — nothing in it is React. React only enters through a hook (`useRemoteModelState`, see Q4) that lives **outside** the wire package, in the app.
- `@emdash/core` (`packages/core`, distinct from the app's own `@core` alias — see Q4 caveat) — the package that defines the ACP/TUI-agent runtime contracts, is exported subpath-by-subpath the same way, with its own worker specs (`acpWorkerSpec`, `tuiAgentsWorkerSpec`, etc.) hosted by `packages/wire/src/worker`, which spawns them as Node child processes and talks to them over the same wire RPC — again no Electron/React coupling at that layer.

**Where UI-shaped assumptions do live is one layer up, in `apps/emdash-desktop`, and that layer is legitimately Electron- and React-flavored** — but that is app wiring, not the contract:

- `apps/emdash-desktop/src/entry/preload.ts` is a thin Electron contextBridge shim exposing `requestWirePort`, plus a few things that are explicitly **not** on the wire (`getPathForFile`, a boot-watchdog escape hatch) because they can't be — the comment in the file says so directly ("This cannot ride the wire: a hung backend means the wire gateway may never register controllers...").
- `apps/emdash-desktop/src/renderer/lib/runtime/seed-desktop-wire.ts` wires `awaitWirePort` + `domPortTransport` + `connect` together as "the only host-owned wire code — port acquisition over the Electron preload bridge. Everything downstream reaches the wire through the core seam" (comment in that file).
- React enters only at `apps/emdash-desktop/src/core/primitives/wire/browser/use-remote-model-state.ts`, a `useEffect`/`useState` hook wrapping the generic `observe()`/`remote()` primitives — this file is app code, not wire/core code.

**Conclusion: the contract and its runtime are honestly transport- and framework-agnostic; the coupling to Electron is confined to one preload file and one connection-seeding file, and the coupling to React is confined to one hooks file.** That is a real, verifiable seam, not an aspiration — but see Q4 for what still has to be rebuilt, because "agnostic" here means "the pieces exist to build a non-Electron non-React client," not "you get one for free."

## 4. Could a brand-new front end (canvas-based, game-style) consume this contract without forking the back end? What would it have to reimplement itself?

**Yes, structurally — nothing found in this audit requires forking `packages/wire` or `packages/core` to build a different UI.** But "consume the contract" undersells the amount of glue code currently sitting in `apps/emdash-desktop/src/core` that a new front end would have to either reuse (if it can share that TypeScript layer) or rebuild from scratch (if it wants a truly separate codebase):

**What genuinely transfers as-is (reusable, framework-agnostic):**
- The wire runtime (`@emdash/wire/rpc`, `/live`, `/state`, `/worker`) — no changes needed.
- Every domain contract object (`agentsContract`, `conversationsContract`, `filesWireContract`, etc.) and the assembled `desktopWireContract` — these are just typed schema objects; a canvas UI can `import { client } from '@emdash/wire/rpc'` and `client(conversationsContract, connection)` exactly as the current renderer does.
- `@emdash/core`'s runtime contracts (`acpApiContract`, `tuiAgentsContract`) and their Zod schemas for turn/message/tool-call/plan shapes (`packages/core/src/runtimes/acp/api/models/*`) — these define what an agent turn/message/tool-call *is*, independent of any renderer.
- The reactive state kernel (`cell`/`derived`/`query`/`family`/`observe`/`remote`) — `observe()` is designed to be bound to anything, not specifically React; a canvas render loop can call it just as validly as a React effect.

**What has to be reimplemented (because it is currently Electron- and/or React-specific, or simply doesn't exist yet as a reusable unit):**
1. **Port acquisition / transport bootstrap.** `seed-desktop-wire.ts` (Electron contextBridge + `MessageChannelMain` + `domPortTransport`) is Electron-only. A non-Electron front end (e.g. a browser-hosted canvas client, or one talking over a network transport) needs a different transport — `streamTransport` (newline-delimited JSON over stdio/SSH) or a new adapter are the documented alternatives, but the wiring is not written.
2. **The 39 per-domain `browser/client.ts` factories and the `domainClient()`/`getWireConnection()` singleton plumbing** (`core/primitives/wire/browser/connection.ts`) — these are small, mechanical, and easily ported, but they are app code, not package code, so a fresh front end that doesn't reuse `apps/emdash-desktop/src/core` wholesale has to re-author ~39 files (or a codegen pass over `domain-contracts.ts`).
3. **The React binding layer** — `useRemoteModelState` and whatever equivalent exists for `liveLog`/`eventStream`/`liveJob` (not audited exhaustively here, but the pattern is per-endpoint-kind hooks). A canvas/game UI would write its own binding — e.g. update mesh/sprite state directly in the `observe()` callback instead of `setState` — which is arguably *simpler* than what React needs, not harder.
4. **The reducer that turns ACP protocol updates into UI-ready transcript state** — `packages/core/src/runtimes/acp/api/reducer/*` (`reducer.ts`, `event-routing.ts`, `content-stream.ts`, `item-fold.ts`, `tool-runs.ts`, `parser.ts`, `decode.ts`, `ids.ts`, `normalized-event.ts`). This is substantial domain logic (turn/message/tool-call assembly, streaming content folding) that currently backs the `session.activeTurn` live-state. It looks reusable (it's in `@emdash/core`, not the app), but it was not opened in depth in this pass and should be read before assuming it's a drop-in — if it renders anything DOM-shaped (e.g. produces markdown/HTML strings for chat bubbles) rather than structured data, a canvas UI would want the structured intermediate form, not its output.
5. **Everything visual** — obviously. The contract carries no view code, so a canvas/game UI gets 100% freedom here, but also 0% help: no component library, no layout, nothing about how a "conversation" should look as a village/scene.
6. **The Electron-only escape hatches** in `preload.ts` (`getPathForFile`, boot-stuck watchdog, `requestBootEscape`) are outside the wire entirely and have no wire equivalent — a non-Electron shell needs its own answers for "pick a native file" and "the backend is stuck at boot," or can drop those features if not needed.

**Net assessment: the back end is consumable without forking, but "without forking" is doing a lot of work in that sentence** — a canvas front end reuses the wire protocol and the ~39 contracts, and can plausibly reuse the ACP/TUI runtime contracts and reducers, but it reimplements: the transport bootstrap, all 39 client-factory files (or generates them), all UI-state bindings, and (unverified, worth checking before committing to reuse) whatever the ACP reducer's actual output shape is.

## 5. How does streaming work (agent output, terminal bytes, file changes)? What is the subscription model?

Three distinct primitives cover three distinct kinds of "changes over time," and the contract picks a different one per data shape rather than using one generic subscription mechanism:

**a. `liveModel` / `liveState` — convergent structured state (agent turn state, file tree, task list, etc.), delta-patched.**
From `packages/wire/docs/live/live-model.md`: the server owns one authoritative JSON object per keyed instance (`LiveStateSource<T>`), mutated only via `produce()` (Immer). Each mutation emits an ordered `LiveUpdate = { generation, baseSequence, sequence, timestamp, delta, mutationIds? }` (`delta` is an Immer patch set) to subscribers, and a full `LiveSnapshot<T> = { generation, sequence, timestamp, data }` is available on demand. Clients ("followers") apply patches in order; `baseSequence` must equal the client's current `sequence` or the client detects a gap and refetches a full snapshot; `generation` bumps on `reseed()` and forces the same resync. Concretely for the agent-streaming case, `acpApiContract.session` (`packages/core/src/runtimes/acp/api/contract.ts`) is a `liveModel` keyed by `{ conversationId }` with 8 co-updated `liveState`s: `state` (lifecycle/generating/canSubmit flags), `config`, `usage`, `plan`, `agents` (background subagents), **`activeTurn`** (the in-progress transcript turn — this is the one that streams token-by-token/tool-call-by-tool-call as the model runs), `terminals`, `mcpServers`.

**b. `liveLog` — append-only retained byte/text streams (terminal output).**
From `docs/live/live-log.md`: `LiveLogSource` keeps a bounded ring buffer (`maxBufferBytes`, default 1 MiB); `append(chunk)` emits `{ chunk }` deltas and updates a retained snapshot `{ baseOffset, text, truncated }`. A late-attaching client gets the retained tail via `snapshot()`, then live `chunk` deltas via `attach()`. This backs `terminals.output` (`core/features/terminals/api/wire-contract.ts`), `tuiAgentsContract.output` (raw PTY bytes for CLI-driven agents), `acpApiContract.terminalOutput` (agent-spawned subprocess terminal), and `agents.loginOutput` (auth flow PTY). Same resync semantics as live models (generation/sequence gap ⇒ resync from the retained snapshot, splicing only missing bytes rather than resetting the terminal).

**c. `eventStream` — fire-and-forget, unretained notifications (file changes, github/browser/update events, etc.).**
From `docs/live/event-stream.md`: no retention, no snapshot of substance; `emit()` drops the event if nobody is attached; a late subscriber gets nothing historical. The doc is explicit that this is the wrong tool for anything a client must not miss ("Anything a late attacher must learn... has to live in a retained snapshot or in the attach acknowledgment, never in an event-stream message"). Used for `projects.events`, `conversations.events`, `github.events`, `browser.events`, `updates.events`, `automations.runEvents`, `notifications.delivery`, `preview-servers.events` — i.e. "something changed, go re-fetch/re-query" signals, not the payload itself. A resource-backed variant (`resourcedStream()` + `createEventStreamHost(def, { activate })`) exists for cases where "attached" must mean "the underlying watcher/resource is actually running" (e.g. this is the natural fit for filesystem-watch-driven UI invalidation).

**Subscription model, uniformly across all three:** a `Connection` (`connect(transport)`) tracks live attachments as durable client-side intent — on transport reconnect, it automatically re-issues `attach()` for every currently-attached topic and forces a fresh snapshot afterward (`docs/api/transports.md`: "`connect()`... re-attaches live topics after each reconnect; replicas then force a fresh snapshot"). Attachment failures after the initial `attach()` succeeds are reported via `onReattachError`/`onError` callbacks with `{ retrying }` rather than throwing (`docs/api/errors.md`, "Live Attachment Errors"): `DISCONNECTED` retries automatically and keeps the topic registered; any other `WireError` is terminal for that attachment and is not retried silently.

**Long-running work (agent turn *execution*, not its streamed content) is `liveJob`, a fourth, separate primitive** — `packages/wire/docs/live/live-job.md` / `contracts.md`: progress + cancellation + terminal-state + reattach, used for things like `agents.install`/`agents.update`, `workspaces.provision`, `automations` runs, `source-control.push`/`pull`/`fetch`, `machines.installSystemDependencies`. This is not how prompt/turn streaming itself works (that's the `session.activeTurn` liveState above) — it's for operations with a start/progress/done shape that isn't itself a stream of content.

**For a canvas UI:** the two subscription shapes that matter most (agent thinking/output, and terminal bytes) are both delta-based with resync-on-gap semantics already built in — a canvas renderer would subscribe via `contractClient.session.state(key, 'activeTurn')` / `.attach()` (or the app's `remote()`/`observe()` wrapper) exactly as the React UI does, and would not need to invent its own reconnection or gap-handling logic; that machinery lives in the wire client, not in the renderer.

## 6. Is there any documentation in the repo describing this contract? Point to it.

**Yes — extensive, and unusually good for a codebase this size.** `packages/wire/docs/` is a real, maintained documentation set (linked from `packages/wire/docs/README.md`), not sparse comments:

- `packages/wire/docs/README.md` — package overview, architecture diagram (mermaid), full page index, package-exports map (`./rpc`, `./live`, `./state`, `./mobx`, `./testing`, `./worker`, `./worker/node`), "Typical Flow" (7-step contract → controller → serve → connect → client → stream/remote), and the "Event Stream Attachment Law" (a genuinely load-bearing design invariant, not boilerplate).
- `packages/wire/docs/api/contracts.md` — `defineContract()`, every endpoint kind (`procedure`, `fallible`, `mutation`, `liveLog`, `eventStream`, `liveJob`, `downloadFile`/`uploadFile`, `liveModel`), nested composition and path-id derivation rules, live model providers (`expose()`).
- `packages/wire/docs/api/serving.md`, `clients.md`, `middleware.md`, `files.md`, `errors.md`, `transports.md` — controller/client creation, cancellation, composable middleware, byte-transfer framing, the full `WireErrorCode` taxonomy with retry guidance per code, and every transport (`memory`, `dom-port`, `electron`, `stream`, `reconnecting`) with code examples.
- `packages/wire/docs/live/` — `live-model.md`, `live-log.md`, `event-stream.md`, `live-job.md`, `mutations.md`, `replicas.md` — the exact protocol shapes quoted in Q5 above.
- `packages/wire/docs/runtime/` — `lifecycle.md`, `structured-concurrency.md`, `scheduling.md`, `resource-cache.md`, `mailbox-and-broadcast.md`, `components.md`, `workers.md` — the `@emdash/shared` foundations wire builds on, plus `WireComponent`/`WireWorkerHost` (used to host the ACP/TUI-agent runtimes as separate Node processes).
- `packages/wire/docs/observability.md` — the `WireInstrumentation` seam.
- `packages/wire/examples/` — 11 runnable example directories (`api-definition`, `cancellation`, `dedupe`, `event-stream`, `job-contract`, `live-log`, `mailbox`, `resource-cache`, `scope`, `state-kernel`) that the docs explicitly cite ("Most snippets in these docs are shortened versions of those files").
- `packages/wire/src/state/README.md` + `01-concepts.md` … `05-migration.md` — a second, separate doc set specifically for the reactive state kernel (`cell`/`derived`/`query`/`family`/`observe`/`expose`/`remote`), including an explicit migration plan off the older ad-hoc `LiveStateSource`-direct-use pattern and a stated production-adoption status ("desktop feature slices (tasks, workspaces, source-control, editor, projects) author providers with `expose` and consume them with `remote`").

**What is not documented at the same level:** the *assembly* of the 39 domain contracts into one app (`domain-contracts.ts`, `desktop-wire.ts`'s lazy routing controller, the per-domain `browser/client.ts` factory pattern) has no equivalent docs/README — that architecture has to be read out of the code itself (as this report did), not out of prose. There is also no single "here is the complete list of every endpoint in the product" document; `domain-contracts.ts` is the closest thing to an index, and it indexes contract *files*, not individual endpoints.
