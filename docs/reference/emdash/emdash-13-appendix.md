# Every other string, and the MCP catalogue

Two things the sections above leave out. First, the full list of MCP servers Emdash offers to install, which ships inside the app. Second, every string in the source that could reach the screen and is not quoted in any section above: interface text first, then messages from the back end that can surface in a toast or an error line. Pure plumbing (developer assertions, type names, identifiers) is filtered out. Each string is verbatim, with the file and line it lives on.

## MCP servers offered in the catalogue

The Library's MCP page offers these servers for one-click install. Transport is how the server runs: a local command, or a hosted URL. Credentials are what the add form asks for.

| Server | What it does | Transport | Credentials | Docs |
|---|---|---|---|---|
| Playwright | Browser automation with Playwright | `npx @playwright/mcp@latest` | none | https://github.com/microsoft/playwright-mcp |
| Context7 | Fetch up-to-date documentation and code examples | URL `https://mcp.context7.com/mcp` | `CONTEXT7_API_KEY` (optional) | https://github.com/upstash/context7 |
| Supabase | Manage databases, authentication, and storage | URL `https://mcp.supabase.com/mcp` | none | https://supabase.com/docs/guides/ai-tools/mcp |
| Vercel | Analyze, debug, and manage projects and deployments | URL `https://mcp.vercel.com` | none | https://vercel.com/docs/agent-resources/vercel-mcp |
| Sentry | Search, query, and debug errors intelligently | URL `https://mcp.sentry.dev/mcp` | none | https://docs.sentry.io/product/sentry-mcp/ |
| Stripe | Payment processing and financial infrastructure tools | URL `https://mcp.stripe.com` | none | https://docs.stripe.com/mcp |
| Figma | Generate diagrams and better code from Figma context | URL `https://mcp.figma.com/mcp` | none | https://help.figma.com/hc/en-us/articles/32132100833559 |
| Linear | Manage issues, projects & team workflows in Linear | URL `https://mcp.linear.app/mcp` | none | https://linear.app/docs/mcp |
| Slack | Send messages, create canvases, and fetch Slack data | URL `https://mcp.slack.com/mcp` | none | https://docs.slack.dev/ai/mcp-server |
| Cloudflare Developer Platform | Build applications with compute, storage, and AI | URL `https://mcp.cloudflare.com/mcp` | none | https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/ |
| Netlify | Create, deploy, manage, and secure websites on Netlify | URL `https://netlify-mcp.netlify.app/mcp` | none | https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/ |
| Chrome DevTools | Browser automation, debugging and performance analysis with Chrome DevTools | `npx -y chrome-devtools-mcp@latest` | none | https://github.com/ChromeDevTools/chrome-devtools-mcp |
| Atlassian | Access Jira & Confluence from Claude | URL `https://mcp.atlassian.com/v1/mcp/authv2` | none | https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/ |
| Notion | Connect your Notion workspace to search, update, and power workflows across tools | URL `https://mcp.notion.com/mcp` | none | https://developers.notion.com/docs/mcp |
| Notra | Create & manage posts, brand identities, integrations, and schedules | URL `https://mcp.usenotra.com/mcp` | `Authorization` | https://docs.usenotra.com/devtools/mcp |
| Clerk | Add authentication, organizations, and billing | URL `https://mcp.clerk.com/mcp` | none | https://clerk.com/docs/guides/ai/mcp/clerk-mcp-server |
| PlanetScale | Authenticated access to your Postgres and MySQL DBs | URL `https://mcp.pscale.dev/mcp/planetscale` | none | https://planetscale.com/docs/connect/mcp |
| Neon | Manage Neon Postgres databases, branches, migrations, and queries | URL `https://mcp.neon.tech/mcp` | none | https://neon.com/docs/ai/neon-mcp-server |
| Google Cloud BigQuery | BigQuery: Advanced analytical insights for agents | URL `https://bigquery.googleapis.com/mcp` | none | https://cloud.google.com/bigquery/docs/use-bigquery-mcp |
| Hugging Face | Access the Hugging Face Hub and thousands of Gradio Apps | URL `https://huggingface.co/mcp` | none | https://huggingface.co/settings/mcp |
| Exa | Web search and code context retrieval powered by Exa AI | URL `https://mcp.exa.ai/mcp` | `x-api-key` (optional) | https://exa.ai/docs/reference/exa-mcp |
| Parallel | Free real-time web search and clean markdown extraction from any URL | URL `https://search.parallel.ai/mcp` | none | https://docs.parallel.ai/integrations/mcp/search-mcp |
| OpenRouter | Search live models, rankings, benchmarks, credits, and OpenRouter docs | URL `https://mcp.openrouter.ai/mcp` | none | https://openrouter.ai/docs/mcp-server |
| Resend | Send emails and manage contacts, broadcasts, and domains | `npx -y resend-mcp` | `RESEND_API_KEY` | https://resend.com/docs/mcp-server |
| PostHog | Query, analyze, and manage your PostHog insights | URL `https://mcp.posthog.com/mcp` | none | https://posthog.com/docs/model-context-protocol |
| Honeycomb | Query and explore observability data and SLOs | URL `https://mcp.honeycomb.io/mcp` | none | https://docs.honeycomb.io/integrations/mcp/configuration-guide |
| GraphOS MCP Tools | Search Apollo docs, specs, and best practices | URL `https://mcp.apollographql.com` | none | https://www.apollographql.com/docs/graphos/platform/graphos-mcp-tools |
| Dev Manager | Launch and manage dev servers; requires the dev-manager daemon to be running separately | `npx dev-manager-mcp stdio` | none | https://github.com/BloopAI/dev-manager-mcp |
| Sanity | Create, query, and manage structured content in Sanity | URL `https://mcp.sanity.io` | none | https://www.sanity.io/docs/ai/mcp-server |
| Amplitude | Search, access, and get insights on your Amplitude data | URL `https://mcp.amplitude.com/mcp` | none | https://amplitude.com/docs/amplitude-ai/amplitude-mcp |
| Asana | Connect to Asana to coordinate tasks, projects, and goals | URL `https://mcp.asana.com/v2/mcp` | none | https://developers.asana.com/docs/mcp-server |
| ClickUp | Project management & collaboration for teams & agents | URL `https://mcp.clickup.com/mcp` | none | https://help.clickup.com/hc/en-us/articles/33335772678423-What-is-ClickUp-MCP |
| Microsoft Learn | Search trusted Microsoft docs to power your development | URL `https://learn.microsoft.com/api/mcp` | none | https://learn.microsoft.com/en-us/training/support/mcp |
| Jam | Record screen and collect automatic context for issues | URL `https://mcp.jam.dev/mcp` | none | https://jam.dev/docs/jam-mcp |
| Webflow | Manage Webflow CMS, pages, assets and sites | URL `https://mcp.webflow.com/mcp` | none | https://developers.webflow.com/mcp/reference/overview |
| Cloudinary | Manage, transform and deliver your images & videos | URL `https://asset-management.mcp.cloudinary.com/mcp` | none | https://cloudinary.com/documentation/cloudinary_llm_mcp |
| WordPress | Secure AI access to manage your WordPress.com sites | URL `https://public-api.wordpress.com/wpcom/v2/mcp/v1` | none | https://developer.wordpress.com/docs/mcp/ |
| Canva | Search, create, autofill, and export Canva designs | URL `https://mcp.canva.com/mcp` | none | https://www.canva.dev/docs/mcp/ |
| Miro | Access and create new content on Miro boards | URL `https://mcp.miro.com/` | none | https://developers.miro.com/docs/miro-mcp |
| Intercom | Access to Intercom data for better customer insights | URL `https://mcp.intercom.com/mcp` | none | https://developers.intercom.com/docs/guides/mcp |
| Make | Run Make scenarios and manage your Make account | URL `https://mcp.make.com` | none | https://developers.make.com/mcp-server/ |
| AWS Marketplace | Discover, evaluate, and buy solutions for the cloud | URL `https://marketplace-mcp.us-east-1.api.aws/mcp` | none | https://docs.aws.amazon.com/marketplace/latest/APIReference/marketplace-mcp-server.html |
| MotherDuck | Analyze your data with natural language | URL `https://api.motherduck.com/mcp` | none | https://motherduck.com/docs/sql-reference/mcp/ |
| Magic Patterns | Discuss and iterate on Magic Patterns designs | URL `https://mcp.magicpatterns.com/mcp` | none | https://www.magicpatterns.com/docs/documentation/features/mcp-server/overview |
| Wix | Manage and build sites and apps on Wix | URL `https://mcp.wix.com/mcp` | none | https://dev.wix.com/docs/api-reference/articles/ai-tools/wix-mcp/about-the-wix-mcp |
| DevRev | Search and update your company's knowledge graph | URL `https://api.devrev.ai/mcp/v1` | `Authorization` (optional) | https://support.devrev.ai/en-US/devrev/article/ZNqaZTsx-devrev-mcp-server-connect-your-ai-coding-assistant |
| Prisma | Manage Prisma Postgres databases, migrations, and connection strings | URL `https://mcp.prisma.io/mcp` | none | https://docs.prisma.io/docs/ai/tools/mcp-server |
| Railway | Create projects, deploy services, and manage Railway infrastructure | URL `https://mcp.railway.com` | none | https://docs.railway.com/ai/mcp-server |
| MongoDB | Query and manage MongoDB databases and Atlas clusters | `npx -y mongodb-mcp-server@latest` | `MDB_MCP_CONNECTION_STRING` | https://www.mongodb.com/docs/mcp-server/ |
| monday.com | Manage boards, items, and workflows in your monday.com workspace | URL `https://mcp.monday.com/mcp` | none | https://developer.monday.com/api-reference/docs/monday-mcp-overview |
| Shopify Dev | Search Shopify docs, explore GraphQL schemas, and validate app code | `npx -y @shopify/dev-mcp@latest` | none | https://shopify.dev/docs/apps/build/ai-toolkit |
| Graphite | Generate and manage stacked pull requests with the Graphite CLI | `gt mcp` | none | https://graphite.com/docs/gt-mcp |
| Executor | One MCP gateway for every tool: connect MCP, OpenAPI, and GraphQL integrations | `executor mcp` | none | https://executor.sh/docs |
| Axiom | Query logs, traces, metrics, and alerts in Axiom observability datasets | URL `https://mcp.axiom.co/mcp` | none | https://axiom.co/docs/console/intelligence/mcp-server |
| Azure MCP Server | Manage Azure resources and run cloud operations through natural language | `npx -y @azure/mcp@latest server start` | none | https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/ |

## Interface text not quoted elsewhere

### Agents

- "See the ${op} panel for retry and recovery options." · `src/core/features/agents/api/browser/use-agent-installation-statuses.ts:93`
- "Dismiss permission error" · `src/core/primitives/agents/browser/SudoRetryPanel.tsx:45`
- "Copy command" · `src/core/primitives/agents/browser/install-command-row.tsx:39`

### Automations

- "Analyze recent commits for high-severity correctness bugs and submit safe fixes" · `src/core/features/automations/browser/builtin-catalog.ts:12`
- "Name this automation" · `src/core/features/automations/browser/components/AutomationDetailView.tsx:71`
- "Remote runtime unavailable" · `src/core/features/automations/browser/components/AutomationRow.tsx:143`
- "Add a prompt to the automation..." · `src/core/features/automations/browser/components/AutomationSettingsFields.tsx:80`
- ""${automation.name}" and its run history will be permanently deleted." · `src/core/features/automations/browser/components/AutomationsView.tsx:82`
- "Connect to the remote automation runtime to load its runs." · `src/core/features/automations/browser/components/RunHistory.tsx:75`
- "Use template" · `src/core/features/automations/browser/components/pickers/UseTemplateButton.tsx:27`

### Browser

- "The browser data request failed." · `src/core/features/browser/browser/browser-toolbar-actions.ts:58`
- "Browser actions" · `src/core/features/browser/browser/browser-toolbar.tsx:236`

### Chat-ui package

- "): Accessor" · `packages/chat-ui/src/components/primitives/card-clip.ts:28`
- "width + extraPerColumn + (index" · `packages/chat-ui/src/components/rows/markdown/table/layout.ts:54`
- "Analyze existing codebase structure and identify components to modify" · `packages/chat-ui/src/mock-transcript.ts:411`
- "Extend cycle length to cover every renderer kind and status" · `packages/chat-ui/src/mock-transcript.ts:428`
- "Add HundredK Storybook story" · `packages/chat-ui/src/mock-transcript.ts:433`

### Chrome stores

- "ChromeCommandResult" · `src/core/primitives/chrome-stores/api/define-chrome-store.ts:62`

### Commands

- "Duplicate command id: ${definition.id}" · `src/core/primitives/commands/api/catalog.ts:16`
- "A command id must not be empty" · `src/core/primitives/commands/api/define-command.ts:31`

### Conversations

- "Chat UI runtime was not installed during renderer bootstrap" · `src/core/features/conversations/api/browser/chat/chat-ui-runtime.ts:16`
- "Live actions are unavailable for this Project." · `src/core/features/conversations/api/browser/conversation-manager.ts:399`
- "): LiveValueSource" · `src/core/features/conversations/browser/acp/acp-live-session.ts:56`

### Desktop runtime

- "Path roots are not compatible" · `src/core/primitives/desktop-runtime/api/paths.ts:66`
- "Path is outside root" · `src/core/primitives/desktop-runtime/api/paths.ts:69`

### Editor

- "MonacoFacetBinder: invalid resource URI: ${decoded.error.message}" · `src/core/features/editor/api/browser/facet-binder/monaco-facet-binder.ts:46`
- "File content search results" · `src/core/features/editor/browser/task-editor/file-content-search.tsx:164`
- "Search failed" · `src/core/features/editor/browser/task-editor/file-content-search.tsx:218`
- "File tree is unavailable" · `src/core/features/editor/browser/task-editor/stores/files-store.ts:276`

### Environment variables

- "Remove environment variable ${index + 1}" · `src/core/primitives/environment-variables/browser/environment-variable-inputs.tsx:60`

### Github

- "Signed in as ${flowUser?.login || flowUser?.name || 'user'}" · `src/core/features/github/api/browser/use-github-auth-events.ts:15`
- "Use accounts already authenticated with GitHub CLI" · `src/core/features/github/browser/github-integration-auth.tsx:157`
- "Add another GitHub account to your Emdash account" · `src/core/features/github/browser/github-integration-auth.tsx:245`
- "Create or sign into your Emdash account with GitHub" · `src/core/features/github/browser/github-integration-auth.tsx:262`

### Integrations

- "${providerName} is disabled for this project." · `src/core/features/integrations/api/account-reporting.ts:16`
- "Failed to connect." · `src/core/features/integrations/browser/SetupFormShell.tsx:52`
- "This connection method cannot reconnect a selected account." · `src/core/features/integrations/browser/integration-setup-modal.tsx:41`
- "useIntegrationsContext must be used inside IntegrationsProvider" · `src/core/features/integrations/contributions/browser/integrations-provider.tsx:221`

### Keybindings

- "Unknown chord key token: ${value}" · `src/core/primitives/keybindings/api/chord.ts:117`
- "A chord must not be empty" · `src/core/primitives/keybindings/api/chord.ts:123`
- "Chord sequences are not supported" · `src/core/primitives/keybindings/api/chord.ts:126`
- "Chords combining Alt with a printable key must use a code token" · `src/core/primitives/keybindings/api/chord.ts:146`
- "Invalid chord: ${value}" · `src/core/primitives/keybindings/api/chord.ts:160`
- "Unknown chord modifier: ${value}" · `src/core/primitives/keybindings/api/chord.ts:91`
- "Unknown keybinding entry: ${forId}" · `src/core/primitives/keybindings/api/conflicts.ts:40`
- "A keybinding settings key must not be empty" · `src/core/primitives/keybindings/api/define-keybinding.ts:58`

### Layouts

- "): LayoutDef" · `src/core/primitives/layouts/api/define-layout.ts:37`
- "A layout id must not be empty" · `src/core/primitives/layouts/api/define-layout.ts:39`
- "]: SlotFill" · `src/core/primitives/layouts/react/slot-fills.ts:18`
- "]?: SlotFill" · `src/core/primitives/layouts/react/slot-fills.ts:20`

### Machines

- "One pattern per line (defaults apply when empty)" · `src/core/features/machines/browser/components/host-settings-card.tsx:196`
- "This permanently deletes “${item.conversation.title}” from its machine. If the machine is offline, the deletion runs when it reconnects." · `src/core/features/machines/browser/components/machine-conversations-list.tsx:162`
- "SSH connections model is not ready" · `src/core/features/machines/browser/machines-store.ts:274`
- "Every conversation record on this machine, including ones no longer linked to a task." · `src/core/features/machines/browser/pages/conversations-settings-page.tsx:10`
- "Review local project workspaces and remove stale task worktrees." · `src/core/features/machines/browser/pages/local-workspaces-settings-page.tsx:11`
- "Install result missing for dependency: ${id}" · `src/core/features/machines/browser/use-system-dependencies.ts:185`
- "See the install panel for retry and recovery options." · `src/core/features/machines/browser/use-system-dependencies.ts:73`

### Mcp

- "Remove MCP server?" · `src/core/features/mcp/browser/components/McpServersList.tsx:30`
- "Search servers…" · `src/core/features/mcp/browser/components/McpToolbar.tsx:29`
- "Refresh providers" · `src/core/features/mcp/browser/components/McpToolbar.tsx:38`
- "Select agent" · `src/core/features/mcp/browser/components/SyncToAgentsSection.tsx:76`

### Mementos

- "A memento id must not be empty" · `src/core/primitives/mementos/api/define-memento.ts:55`
- "): SubjectSpace" · `src/core/primitives/mementos/browser/memento-client.ts:117`
- "MementoClient is disposed" · `src/core/primitives/mementos/browser/memento-client.ts:235`
- "): MementoHandle" · `src/core/primitives/mementos/browser/memento-client.ts:285`
- "SubjectSpace is released" · `src/core/primitives/mementos/browser/memento-client.ts:286`
- "Memento handle" · `src/core/primitives/mementos/browser/memento-client.ts:542`
- "Mementos must be configured before initialization" · `src/core/primitives/mementos/browser/singleton.ts:18`
- "Mementos have not been configured" · `src/core/primitives/mementos/browser/singleton.ts:25`
- "useMementoClient must be used inside MementoClientProvider" · `src/core/primitives/mementos/react/subject-context.tsx:73`
- "A memento subject hook must be used inside SubjectProvider" · `src/core/primitives/mementos/react/subject-context.tsx:87`
- "No SubjectProvider for subject kind" · `src/core/primitives/mementos/react/subject-context.tsx:96`

### Modals

- "Duplicate modal id: ${definition.id}" · `src/core/primitives/modals/react/catalog.ts:18`
- "A modal id must not be empty" · `src/core/primitives/modals/react/define-modal.ts:38`
- "useModalController must be used inside a modal host" · `src/core/primitives/modals/react/host-context.tsx:22`
- "Active modal is" · `src/core/primitives/modals/react/host-context.tsx:25`
- "useCloseGuard must be used inside a modal host" · `src/core/primitives/modals/react/use-close-guard.ts:12`

### Navigation

- "0 : this.index" · `src/core/primitives/navigation/browser/navigation-history-store.ts:123`
- "No params have been recorded for view" · `src/core/primitives/navigation/browser/navigation-hooks.ts:102`
- "ViewParams" · `src/core/primitives/navigation/browser/navigation-hooks.ts:83`
- "Navigation history memento is already attached" · `src/core/primitives/navigation/browser/navigation-store.ts:100`

### Palette

- ", definitions: TItems): CommandPaletteCatalog" · `src/core/primitives/palette/api/command-palette-catalog.ts:12`
- "Duplicate command palette command id: ${command.id}" · `src/core/primitives/palette/api/command-palette-catalog.ts:18`
- "Command palette command is not in command catalog: ${command.id}" · `src/core/primitives/palette/api/command-palette-catalog.ts:21`
- "Command palette command must accept undefined input: ${command.id}" · `src/core/primitives/palette/api/command-palette-catalog.ts:24`
- "Duplicate palette provider kind: ${provider.kind}" · `src/core/primitives/palette/api/provider-catalog.ts:17`
- "Duplicate palette provider keyword: ${provider.keyword}" · `src/core/primitives/palette/api/provider-catalog.ts:20`

### Projects

- "ProjectManagerStore is disposed" · `src/core/features/projects/api/browser/stores/project-manager.ts:317`
- "Repository creation response was incomplete" · `src/core/features/projects/api/browser/stores/project-manager.ts:523`
- "Project creation was cancelled" · `src/core/features/projects/api/browser/stores/project-manager.ts:862`
- "Cannot update unregistered project ${this.id}" · `src/core/features/projects/api/browser/stores/project.ts:54`
- "Cannot change project identity from ${this.id} to ${data.id}" · `src/core/features/projects/api/browser/stores/project.ts:56`
- "Select a machine connection before resolving the repositories root." · `src/core/features/projects/browser/components/add-project-modal/add-project-modal.tsx:107`
- "Choose who can see and commit to this repository" · `src/core/features/projects/browser/components/add-project-modal/content.tsx:143`
- "Project location" · `src/core/features/projects/browser/components/add-project-modal/location-selector.tsx:50`
- "Repository owner" · `src/core/features/projects/browser/components/add-project-modal/owner-selector.tsx:54`
- "Directory location" · `src/core/features/projects/browser/components/add-project-modal/project-directory-picker.tsx:163`
- "Project actions" · `src/core/features/projects/browser/components/main-panel/project-header.tsx:96`
- "Pull request diff lines" · `src/core/features/projects/browser/components/pr-view/pr-row.tsx:75`
- "Settings to import" · `src/core/features/projects/browser/components/settings-view/project-config-import-modal.tsx:127`
- "Save to" · `src/core/features/projects/browser/components/settings-view/project-config-import-modal.tsx:137`
- "– stored only on this machine" · `src/core/features/projects/browser/components/settings-view/project-config-import-modal.tsx:147`
- "– commit to share with team" · `src/core/features/projects/browser/components/settings-view/project-config-import-modal.tsx:154`
- "Choose the directory where worktrees should be created." · `src/core/features/projects/browser/components/settings-view/sections/base-project-settings-section.tsx:173`
- "Used for fetching remote branches, choosing task base branches and targeting pull requests." · `src/core/features/projects/browser/components/settings-view/sections/base-project-settings-section.tsx:286`
- "for the full project config reference." · `src/core/features/projects/browser/components/settings-view/sections/shareable-project-settings-section.tsx:248`
- "Settings to share" · `src/core/features/projects/browser/components/settings-view/share-project-config-modal.tsx:175`
- "Use team settings for ${leafLabel}" · `src/core/features/projects/browser/components/settings-view/shareable-setting-title.tsx:62`
- "Project context no longer exists" · `src/core/features/projects/browser/stores/project-context.ts:55`
- "): ProjectHostObservation" · `src/core/features/projects/browser/stores/project-context.ts:64`

### Renderer app

- "Shutting down Emdash" · `src/renderer/app/app-shutdown-lifecycle.tsx:146`

### Renderer error-boundary.tsx

- "Emdash couldn’t display that view" · `src/renderer/error-boundary.tsx:34`

### Repository

- "Invalid nameWithOwner:" · `src/core/primitives/repository/api/repository-ref.ts:114`

### Scoped stores

- "ScopedStoreHost is disposed" · `src/core/primitives/scoped-stores/browser/scoped-store-host.ts:111`
- "Duplicate scoped store token" · `src/core/primitives/scoped-stores/browser/scoped-store-host.ts:70`
- "Scoped store" · `src/core/primitives/scoped-stores/browser/scoped-store-host.ts:83`

### Settings

- "Delete Profile" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:119`
- "New browser tabs open with this profile. You can switch an individual tab" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:143`
- "${profile.name} browser profile actions" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:244`
- "Save new browser profile" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:301`
- "Cancel adding profile" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:312`
- "Delete site data" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:411`
- "Clear all data" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:427`
- "Delete site data?" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:436`
- "Delete cached files" · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:445`
- "The browser profile no longer exists or could not be cleared." · `src/core/features/settings/browser/components/BrowserSettingsCard.tsx:460`
- "This removes the saved ${integration.name} credentials for this account." · `src/core/features/settings/browser/components/IntegrationAccountsSection.tsx:49`
- "Copy install command" · `src/core/features/settings/browser/components/IntegrationRow.tsx:195`
- "Unknown settings page: ${id}" · `src/core/features/settings/browser/components/SettingsPage.tsx:50`
- "More info about auto-trust worktrees" · `src/core/features/settings/browser/components/TaskSettingsRows.tsx:92`
- "Decrease terminal font size" · `src/core/features/settings/browser/components/TerminalSettingsCard.tsx:307`
- "Increase terminal font size" · `src/core/features/settings/browser/components/TerminalSettingsCard.tsx:322`
- "Manage installed CLI agents and their configuration." · `src/core/features/settings/browser/search/settings-search.ts:140`
- "Manage local MCP servers available to agents." · `src/core/features/settings/browser/search/settings-search.ts:147`
- "Manage reusable local agent skills." · `src/core/features/settings/browser/search/settings-search.ts:154`
- "Show or hide detected" · `src/core/features/settings/browser/search/settings-search.ts:329`
- "Allow localhost pages in Emdash browser tabs to call APIs without CORS headers." · `src/core/features/settings/browser/search/settings-search.ts:344`
- "Clear cookies, cached files, and site data from the in-app browser." · `src/core/features/settings/browser/search/settings-search.ts:358`
- "Open in options" · `src/core/features/settings/contributions/browser/open-in-menu.tsx:165`
- "Select open in app" · `src/core/features/settings/contributions/browser/open-in-menu.tsx:171`
- "Return to the previous view" · `src/core/features/settings/contributions/commands.ts:7`

### Source control

- "Search branches" · `src/core/features/source-control/browser/components/branch-selector.tsx:184`
- "Could not save the selected account." · `src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/create-pr-modal.tsx:101`
- "Project settings are unavailable." · `src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/create-pr-modal.tsx:95`
- "Failed to load commit files" · `src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/use-commit-files.ts:25`
- "Failed to load commits" · `src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/use-commits.ts:55`
- "Pull request files" · `src/core/features/source-control/browser/diff-view/changes-panel/pr-section.tsx:200`
- "Diff tab manager unavailable for workspace ${taskCtx.workspaceId}" · `src/core/features/source-control/browser/diff-view/diff-tab-provider.tsx:85`
- "This repository has no git remotes." · `src/core/features/source-control/browser/stores/git-checkout-store.ts:360`
- "PR cache lookup failed: ${result.error.type}" · `src/core/features/source-control/browser/stores/task-pr-sync-coordinator.ts:213`
- "Git status unavailable" · `src/core/features/source-control/contributions/browser/changes-panel.tsx:157`
- ", body:" · `src/core/features/source-control/contributions/browser/changes-panel.tsx:247`
- "Project context is unavailable" · `src/core/features/source-control/contributions/browser/changes-panel.tsx:77`

### Subjects

- "): Subject" · `src/core/primitives/subjects/api/subject.ts:17`

### Tasks

- "Repository workspace required" · `src/core/features/tasks/api/browser/create-task-modal/use-project-git-context.ts:58`
- "Manual port forwarding requires a remote workspace" · `src/core/features/tasks/api/browser/stores/preview-server-store.ts:124`
- "Live preview data is unavailable for this Project." · `src/core/features/tasks/api/browser/stores/preview-server-store.ts:52`
- "This task does not have a workspace record and cannot be opened." · `src/core/features/tasks/api/browser/stores/task-manager.ts:528`
- "Task list model is unavailable" · `src/core/features/tasks/api/browser/stores/task-manager.ts:789`
- "Task scoped store" · `src/core/features/tasks/api/browser/stores/task-store.ts:148`
- "TaskStore is disposed" · `src/core/features/tasks/api/browser/stores/task-store.ts:160`
- "Project scoped store" · `src/core/features/tasks/api/browser/stores/task-store.ts:334`
- "Task mutations are unavailable" · `src/core/features/tasks/api/browser/stores/task-store.ts:342`
- "Git repository is unavailable" · `src/core/features/tasks/browser/add-remote-modal.tsx:162`
- "Git checkout is unavailable" · `src/core/features/tasks/browser/add-remote-modal.tsx:186`
- "Could not remember the selected account." · `src/core/features/tasks/browser/add-remote-modal.tsx:94`
- "Select issue provider" · `src/core/features/tasks/browser/components/issue-selector/issue-selector.tsx:203`
- "Filter by status" · `src/core/features/tasks/browser/components/pr-selector/pr-selector.tsx:191`
- "Search pull requests…" · `src/core/features/tasks/browser/components/pr-selector/pr-selector.tsx:241`
- "Connect GitHub to load PRs" · `src/core/features/tasks/browser/components/pr-selector/pr-selector.tsx:259`
- "Forward remote port" · `src/core/features/tasks/browser/components/preview-servers/manual-forward-button.tsx:30`
- "Open preview ${formatPreviewServerLabel(server)}" · `src/core/features/tasks/browser/components/preview-servers/preview-server-pill.tsx:60`
- "Add ${action.prompt.title}" · `src/core/features/tasks/browser/context-bar/prompt-actions-menu.tsx:129`
- "The Task is still available, but its workspace needs live Project access." · `src/core/features/tasks/browser/main-panel.tsx:114`
- "Emdash could not activate this workspace. Re-provision it or remove the task." · `src/core/features/tasks/browser/main-panel.tsx:149`
- "Create task branch and worktree" · `src/core/features/tasks/browser/task-config/branch-picker-field.tsx:76`
- "Git Publish Branch" · `src/core/features/tasks/browser/task-scope.tsx:272`
- "Publish this branch to remote" · `src/core/features/tasks/browser/task-scope.tsx:272`
- "Remove this task from pinned" · `src/core/features/tasks/browser/task-scope.tsx:294`
- "Search projects..." · `src/core/features/tasks/contributions/browser/project-selector.tsx:78`
- "useTaskState must be used inside a TaskStateProvider" · `src/core/features/tasks/contributions/browser/task-config/task-state-context.tsx:29`
- "Go back in the active browser tab" · `src/core/features/tasks/contributions/commands.ts:107`
- "Browser Forward" · `src/core/features/tasks/contributions/commands.ts:114`
- "Go forward in the active browser tab" · `src/core/features/tasks/contributions/commands.ts:115`
- "Reload Browser" · `src/core/features/tasks/contributions/commands.ts:122`
- "Reload the active browser tab" · `src/core/features/tasks/contributions/commands.ts:123`
- "Focus Browser URL" · `src/core/features/tasks/contributions/commands.ts:130`
- "Focus the URL field in the active browser tab" · `src/core/features/tasks/contributions/commands.ts:131`
- "Open the active browser URL in the system browser" · `src/core/features/tasks/contributions/commands.ts:139`
- "Copy the active browser URL" · `src/core/features/tasks/contributions/commands.ts:147`
- "Fetch latest changes from remote" · `src/core/features/tasks/contributions/commands.ts:156`
- "Create a new conversation in a split pane to the right" · `src/core/features/tasks/contributions/commands.ts:16`
- "Git Pull" · `src/core/features/tasks/contributions/commands.ts:163`
- "Pull latest changes from remote" · `src/core/features/tasks/contributions/commands.ts:164`
- "Git Push" · `src/core/features/tasks/contributions/commands.ts:171`
- "Push commits to remote" · `src/core/features/tasks/contributions/commands.ts:172`
- "Pin this task to keep it at the top" · `src/core/features/tasks/contributions/commands.ts:180`
- "Archive the current task" · `src/core/features/tasks/contributions/commands.ts:188`
- "Switch to the next task" · `src/core/features/tasks/contributions/commands.ts:207`
- "Switch to the previous task" · `src/core/features/tasks/contributions/commands.ts:218`
- "Delete the selected tasks" · `src/core/features/tasks/contributions/commands.ts:229`
- "Open the Changes panel in the right sidebar" · `src/core/features/tasks/contributions/commands.ts:25`
- "Open the Conversations panel in the right sidebar" · `src/core/features/tasks/contributions/commands.ts:34`
- "Open the Files panel in the right sidebar" · `src/core/features/tasks/contributions/commands.ts:43`
- "Focus file content search in the right sidebar" · `src/core/features/tasks/contributions/commands.ts:52`
- "Open the terminal drawer" · `src/core/features/tasks/contributions/commands.ts:63`
- "Create a new conversation in the current task" · `src/core/features/tasks/contributions/commands.ts:7`
- "Show or hide the terminal drawer" · `src/core/features/tasks/contributions/commands.ts:71`
- "Show or hide the right sidebar" · `src/core/features/tasks/contributions/commands.ts:80`
- "Create a new terminal session" · `src/core/features/tasks/contributions/commands.ts:89`
- "Open an in-app browser for this task" · `src/core/features/tasks/contributions/commands.ts:98`

### Terminals

- "Terminal ${terminalId} did not hydrate" · `src/core/features/terminals/api/browser/task-terminal/terminal-manager.ts:283`
- "Close ${terminal.data.name}" · `src/core/features/terminals/browser/task-terminal/terminal-drawer-tab-bar.tsx:123`

### Theme

- "No @emdash/theme entry for selector" · `src/core/primitives/theme/browser/theme-provider.tsx:37`

### Ui package

- "): ReadonlySet" · `packages/ui/src/react/components/file-tree/file-tree.tsx:869`
- "Image: ${imageAlt}" · `packages/ui/src/react/components/image-viewer/image-viewer-dialog.tsx:38`
- "Prompt editor model is already attached" · `packages/ui/src/react/components/prompt-editor/prompt-editor-model.ts:96`
- "PromptEditor accepts either a model or a controlled value, not both" · `packages/ui/src/react/components/prompt-editor/prompt-editor.tsx:202`
- "CollectionView requires exactly one of" · `packages/ui/src/react/patterns/collection-view/collection-view.tsx:441`
- "CollectionView with" · `packages/ui/src/react/patterns/collection-view/collection-view.tsx:447`
- "CollectionView" · `packages/ui/src/react/patterns/collection-view/collection-view.tsx:450`
- "Create From type" · `packages/ui/src/react/patterns/create-task-modal/create-from-picker.tsx:154`
- "Pull Request status" · `packages/ui/src/react/patterns/create-task-modal/create-from-picker.tsx:247`
- "Improve Create Task" · `packages/ui/src/react/patterns/create-task-modal/create-task-modal.fixtures.ts:41`
- "Anthropic coding agent" · `packages/ui/src/react/patterns/create-task-modal/create-task-modal.fixtures.ts:58`
- "Balanced model" · `packages/ui/src/react/patterns/create-task-modal/create-task-modal.fixtures.ts:66`
- "Spend more time reasoning" · `packages/ui/src/react/patterns/create-task-modal/create-task-modal.fixtures.ts:76`
- "Conversation interface" · `packages/ui/src/react/patterns/create-task-modal/create-task-modal.tsx:313`
- "View ${resource.name}" · `packages/ui/src/react/patterns/create-task-modal/create-task-prompt.tsx:337`
- "Retry ${resource.name}" · `packages/ui/src/react/patterns/create-task-modal/create-task-prompt.tsx:84`
- "| CreateTaskChoice" · `packages/ui/src/react/patterns/create-task-modal/footer-choice-picker.tsx:38`
- "[]): Comparator" · `packages/ui/src/react/patterns/list-view/comparators.ts:53`
- "): SearchSpec" · `packages/ui/src/react/patterns/list-view/core/define-helpers.ts:23`
- "): SortSpec" · `packages/ui/src/react/patterns/list-view/core/define-helpers.ts:53`
- "): PaginationSpec" · `packages/ui/src/react/patterns/list-view/core/define-helpers.ts:58`
- "): RenameSpec" · `packages/ui/src/react/patterns/list-view/core/define-helpers.ts:68`
- "): TreeNode" · `packages/ui/src/react/patterns/tree-view/tree-model.ts:67`
- "): [Sprinkles, Record" · `packages/ui/src/react/primitives/box/index.tsx:44`
- "useTheme must be used inside a ThemeProvider" · `packages/ui/src/react/primitives/theme-provider.tsx:103`
- ", keyof AsProp" · `packages/ui/src/react/primitives/typography/Text.tsx:8`

### Updates

- "Update API unavailable" · `src/core/features/updates/browser/update-store.tsx:137`
- "Failed to install update" · `src/core/features/updates/browser/update-store.tsx:148`

### View scopes

- "CommandBinding" · `src/core/primitives/view-scopes/api/define-view-scope.ts:120`
- "A view scope id must not be empty" · `src/core/primitives/view-scopes/api/define-view-scope.ts:150`
- "Duplicate command id in view scope ${options.id}: ${command.id}" · `src/core/primitives/view-scopes/api/define-view-scope.ts:156`
- "): ViewScopeRef" · `src/core/primitives/view-scopes/api/define-view-scope.ts:86`
- "Cannot attach ${definition.id} to a disposed parent scope" · `src/core/primitives/view-scopes/browser/scopes.ts:188`
- "Cannot activate a disposed view scope" · `src/core/primitives/view-scopes/browser/scopes.ts:205`
- "View scope ${instance.def.id} does not use logical activation" · `src/core/primitives/view-scopes/browser/scopes.ts:208`
- "Cannot activate a disposed view scope as a capture" · `src/core/primitives/view-scopes/browser/scopes.ts:224`
- "View scope ${instance.def.id} is not capturing" · `src/core/primitives/view-scopes/browser/scopes.ts:227`
- "ViewScopeImpl" · `src/core/primitives/view-scopes/react/use-view-scope.ts:34`
- "Missing command binding ${command.id} in view scope ${definition.id}" · `src/core/primitives/view-scopes/react/use-view-scope.ts:47`
- "Failed to bind command ${command.id} in view scope ${definition.id}" · `src/core/primitives/view-scopes/react/use-view-scope.ts:52`

### Views

- "Duplicate view id: ${definition.id}" · `src/core/primitives/views/api/catalog.ts:20`
- "): ViewRef" · `src/core/primitives/views/api/define-view.ts:35`
- "A view id must not be empty" · `src/core/primitives/views/api/define-view.ts:76`
- "Duplicate view runtime: ${contribution.def.id}" · `src/core/primitives/views/react/runtime.ts:40`

### Workbench

- "The link could not be copied to the clipboard." · `src/core/features/workbench/api/browser/open-external-link.ts:55`
- "useWorkspace: task is not provisioned" · `src/core/features/workbench/api/browser/task-composition-context.ts:22`
- "useWorkspaceId: task has no workspace" · `src/core/features/workbench/api/browser/task-composition-context.ts:29`
- "usePreviewServers: task is not provisioned" · `src/core/features/workbench/api/browser/task-composition-context.ts:35`
- "Clear ${inputChrome.keyword} mode" · `src/core/features/workbench/browser/command-palette/command-palette-modal.tsx:145`
- "Project conflicts" · `src/core/features/workbench/browser/onboarding/components/project-conflicts.tsx:104`
- "Start fresh failed" · `src/core/features/workbench/browser/onboarding/import-step.tsx:103`
- "Project context unavailable" · `src/core/features/workbench/browser/sidebar/project-item.tsx:186`
- "Sort projects" · `src/core/features/workbench/browser/sidebar/projects-group-label.tsx:21`
- "Sidebar memento is already attached" · `src/core/features/workbench/browser/sidebar/sidebar-store.ts:89`
- "Switch to the next tab" · `src/core/features/workbench/contributions/commands.ts:103`
- "Switch to the previous tab" · `src/core/features/workbench/contributions/commands.ts:111`
- "Close the active tab" · `src/core/features/workbench/contributions/commands.ts:119`
- "Reopen the most recently closed tab" · `src/core/features/workbench/contributions/commands.ts:127`
- "Rename the active tab" · `src/core/features/workbench/contributions/commands.ts:135`
- "Move the active tab to a new pane on the right" · `src/core/features/workbench/contributions/commands.ts:143`
- "Save the active editor file" · `src/core/features/workbench/contributions/commands.ts:167`
- "Save all open editor files" · `src/core/features/workbench/contributions/commands.ts:175`
- "Search the focused terminal" · `src/core/features/workbench/contributions/commands.ts:183`
- "Show or hide the left sidebar" · `src/core/features/workbench/contributions/commands.ts:221`
- "Navigate to the previous location" · `src/core/features/workbench/contributions/commands.ts:53`
- "Navigate to the next location" · `src/core/features/workbench/contributions/commands.ts:62`
- "Open the command palette to quickly search and navigate" · `src/core/features/workbench/contributions/commands.ts:71`
- "Close the current modal or dialog" · `src/core/features/workbench/contributions/commands.ts:95`

### Workbench shell

- "No tab provider registered for kind: ${kind}" · `src/core/primitives/workbench-shell/browser/tabs/core/tab-provider-registry.ts:119`
- "Close ${label}" · `src/core/primitives/workbench-shell/browser/tabs/tab-bar/generic-tab-item.tsx:185`
- "Keep Open" · `src/core/primitives/workbench-shell/browser/tabs/tab-bar/tab-context-menu.tsx:46`
- "Close Other Tabs" · `src/core/primitives/workbench-shell/browser/tabs/tab-bar/tab-context-menu.tsx:60`

### Workspaces

- "Workspace scan completed with warnings" · `src/core/features/workspaces/contributions/browser/repository-header.tsx:139`
- "Workspace actions" · `src/core/features/workspaces/contributions/browser/repository-header.tsx:72`
- "new-worktree preset requires a fromBranch or defaultBranch in context" · `src/core/primitives/workspaces/api/build-workspace-config-from-preset.ts:23`
- "checkout-pr preset requires a PR in context" · `src/core/primitives/workspaces/api/build-workspace-config-from-preset.ts:78`
- "pr-new-branch preset requires a PR in context" · `src/core/primitives/workspaces/api/build-workspace-config-from-preset.ts:96`
- "Cannot publish the task branch because the repository has no push remote." · `src/core/primitives/workspaces/api/compile-worktree-git-plan.ts:130`
- "Cannot compile a PR-sourced git plan: the repository has no git remotes." · `src/core/primitives/workspaces/api/compile-worktree-git-plan.ts:74`
- "Create an isolated worktree on a branch" · `src/core/primitives/workspaces/api/workspace-presets.ts:33`
- "Work directly in the project directory (no worktree)" · `src/core/primitives/workspaces/api/workspace-presets.ts:40`
- "Reuse an existing worktree or repository workspace" · `src/core/primitives/workspaces/api/workspace-presets.ts:47`
- "Fetch and review a pull request in its own worktree" · `src/core/primitives/workspaces/api/workspace-presets.ts:54`
- "Create a new branch on top of the PR head for your changes" · `src/core/primitives/workspaces/api/workspace-presets.ts:61`

## Back-end messages not quoted elsewhere

### Account

- "Invalid sign-in response: missing sessionToken or user" · `src/core/features/account/node/services/account-auth-response-parser.ts:15`
- "Invalid account link response: missing provider token" · `src/core/features/account/node/services/account-auth-response-parser.ts:33`
- "Invalid account link start response" · `src/core/features/account/node/services/account-auth-server-client.ts:72`
- "Invalid account link start response: missing accountLinkState" · `src/core/features/account/node/services/account-auth-server-client.ts:80`
- "You must be signed in to link a provider account" · `src/core/features/account/node/services/account-session-store.ts:86`
- "Account linking is not supported for provider "${provider}"" · `src/core/features/account/node/services/emdash-account-service.ts:139`

### Agents

- "No plugin metadata found for provider: ${id}" · `src/core/features/agents/api/node/plugin-registry.ts:15`
- "Unknown agent provider: ${value}" · `src/core/features/agents/api/node/plugin-registry.ts:28`
- "No plugin found for provider: ${id}" · `src/core/features/agents/api/node/plugin-registry.ts:9`

### Automations

- "Runtime project '${projectId}' was not found" · `src/core/features/automations/node/runtime-client-resolver.ts:22`

### Catalog

- "Invalid Skills.sh skill reference" · `src/core/features/catalog/node/catalog-service.ts:480`
- "Skills.sh source "${skill.sourceRef}" is not a GitHub repository" · `src/core/features/catalog/node/catalog-service.ts:484`
- "Could not fetch SKILL.md for ${skill.sourceRef}/${skill.catalogSkillId}" · `src/core/features/catalog/node/catalog-service.ts:514`
- "| Result" · `src/core/features/catalog/node/wire-controller.ts:29`

### Conversations

- "Conversation '${values.id}' disappeared during adoption" · `src/core/features/conversations/api/node/registry/conversation-registry.ts:155`
- "createConversation: host index registration failed: ${registered.message}" · `src/core/features/conversations/node/createConversation.ts:131`
- "createConversation: inserted row for ${id} is missing its task link" · `src/core/features/conversations/node/createConversation.ts:166`
- "createConversation: the task has no resolvable workspace" · `src/core/features/conversations/node/createConversation.ts:76`
- "Conversation not found: ${conversationId}" · `src/core/features/conversations/node/host-mutation.ts:41`
- "The workspace host is offline. Reconnect the machine to edit conversations." · `src/core/features/conversations/node/host-mutation.ts:45`
- "The conversation's host is unavailable: ${client.error.message}" · `src/core/features/conversations/node/host-mutation.ts:49`
- "Conversation not found" · `src/core/features/conversations/node/launch-tui-conversation.ts:53`
- "Conversation has no task link" · `src/core/features/conversations/node/launch-tui-conversation.ts:55`
- "Task ${input.taskId} was not found in project ${input.projectId}" · `src/core/features/conversations/node/link-conversation-to-task.ts:31`
- "Rename was rejected by the host: ${renamed.error.message}" · `src/core/features/conversations/node/renameConversation.ts:25`
- "Could not resolve task session launch context: ${launchContext.error.type}" · `src/core/features/conversations/node/tui-conversation-provider.ts:146`
- "TUI session failed to start: ${JSON.stringify(result.error)}" · `src/core/features/conversations/node/tui-conversation-provider.ts:94`
- "Conversation '${conversationId}' has no task link" · `src/core/features/conversations/node/wire-controller.ts:400`

### Files

- "Disk content is forwarded, not re-hosted" · `src/core/features/files/node/wire-controller.ts:214`
- "Cross-host file mutations are not supported" · `src/core/features/files/node/wire-controller.ts:341`
- "Invalid resource URI: ${decoded.error.message}" · `src/core/features/files/node/wire-controller.ts:381`

### Github

- "Managed Git credentials are not supported for ${account.providerId}." · `src/core/features/github/api/node/services/git-credentials-service.ts:140`
- "GitHub account identity is incomplete" · `src/core/features/github/node/accounts/github-auth-connection.ts:55`
- "${repositoryTarget(host, nameWithOwner)} was not found, or the selected GitHub account does not have access." · `src/core/features/github/node/services/github-api-errors.ts:230`
- "Failed to read authenticated GitHub user" · `src/core/features/github/node/services/github-device-flow-service.ts:74`

### Main bootstrap

- "SSH connection ${connectionId} is not available" · `src/main/bootstrap/boot/phases/services.ts:207`
- "No usable workspace server for SSH connection ${connectionId}" · `src/main/bootstrap/boot/phases/services.ts:215`
- "Host '${connectionId}' is not managed" · `src/main/bootstrap/boot/phases/services.ts:218`
- "local host runtime unavailable" · `src/main/bootstrap/boot/phases/services.ts:296`
- "Project ${projectId} does not exist." · `src/main/bootstrap/boot/phases/services.ts:514`
- "GitHub is disabled for this project." · `src/main/bootstrap/boot/phases/services.ts:600`
- "The selected GitHub account is no longer connected." · `src/main/bootstrap/boot/phases/services.ts:605`
- "No GitHub account is configured for this project." · `src/main/bootstrap/boot/phases/services.ts:610`
- "GitHub integration plugin does not declare an oauth-device auth method." · `src/main/bootstrap/boot/phases/services.ts:630`
- "Shutdown runtime clients have not been configured" · `src/main/bootstrap/shutdown/index.ts:18`

### Main core

- "${name.replace(/\.[^.]+$/, '')}.png" · `src/main/core/app/persist-terminal-attachment.ts:59`
- "Invalid URL format" · `src/main/core/app/service.ts:203`
- "Default applications are only available for local files" · `src/main/core/app/service.ts:215`
- "Show in file manager is only available for local workspaces" · `src/main/core/app/service.ts:241`
- "Invalid clipboard text" · `src/main/core/app/service.ts:266`
- "Invalid context menu request" · `src/main/core/app/service.ts:278`
- "Invalid arguments" · `src/main/core/app/service.ts:365`
- "Invalid app ID" · `src/main/core/app/service.ts:370`
- "${label} is not available on this platform." · `src/main/core/app/service.ts:376`
- "SSH connection not found" · `src/main/core/app/service.ts:403`
- "Remote SSH not yet implemented for ${label}" · `src/main/core/app/service.ts:524`
- "Unable to launch ${label}" · `src/main/core/app/service.ts:542`
- "Unsupported platform or app" · `src/main/core/app/service.ts:592`
- "Invalid audio path" · `src/main/core/app/service.ts:656`
- "Audio file must be located within the user home directory" · `src/main/core/app/service.ts:662`
- "Unsupported audio file type" · `src/main/core/app/service.ts:667`
- "Audio path is not a file" · `src/main/core/app/service.ts:670`
- "Audio file is larger than 20 MB" · `src/main/core/app/service.ts:671`
- "No existing ancestor for path: ${formatAbsolute(absPath)}" · `src/main/core/files/realpath-containment.ts:43`
- "Expected absolute path: ${input}" · `src/main/core/runtime/files-helpers.ts:117`
- "Expected path inside ${rootPath}: ${input}" · `src/main/core/runtime/files-helpers.ts:124`
- ", JobError" · `src/main/core/runtime/live-job.ts:17`

### Main db

- "Missing bundled SQL for migration: ${entry.tag}" · `src/main/db/initialize.ts:43`
- "Invalid SQL identifier: ${identifier}" · `src/main/db/legacy-port/sqlite-utils.ts:5`

### Main gateway

- "Unknown desktop wire path '${path}'" · `src/main/gateway/desktop-wire.ts:123`
- "Host '${id}' is not managed" · `src/main/gateway/host-availability.ts:32`
- "Remote workspace server is unavailable" · `src/main/gateway/runtime-broker.ts:61`

### Main host

- "Command Palette\u2026" · `src/main/host/menu.ts:156`
- "Report Issue\u2026" · `src/main/host/menu.ts:201`
- "About ${app.name}" · `src/main/host/menu.ts:67`
- "Settings\u2026" · `src/main/host/menu.ts:72`
- "Check for Updates\u2026" · `src/main/host/menu.ts:77`
- "Quit ${app.name}" · `src/main/host/menu.ts:88`
- "Recovery HTML is missing its bootstrap sentinel" · `src/main/host/recovery/recovery-bootstrap.ts:24`
- "Open ${PRODUCT_NAME}" · `src/main/host/tray.ts:48`
- "Quit ${PRODUCT_NAME}" · `src/main/host/tray.ts:53`
- "Update service is not active" · `src/main/host/updates/update-service.ts:208`
- "Cannot download: status is "${this.updateState.status}", not "available"" · `src/main/host/updates/update-service.ts:215`
- "No version information available for download" · `src/main/host/updates/update-service.ts:218`

### Preview servers

- "SSH runtime is not attached" · `src/core/features/preview-servers/node/preview-server-service.ts:545`
- "Manual preview forwarding was cancelled" · `src/core/features/preview-servers/node/preview-server-service.ts:665`

### Projects

- ", ErrorOf" · `src/core/features/projects/api/node/attached-project.ts:12`
- "Could not resolve the selected working copy." · `src/core/features/projects/api/node/settings/project-settings-service.ts:199`
- "Wrote .emdash.json, but failed to clear shared project settings." · `src/core/features/projects/api/node/settings/project-settings-service.ts:228`
- "Shareable project settings are already configured." · `src/core/features/projects/api/node/settings/project-settings-service.ts:250`
- "Project Host access is unavailable: ${project.error.type}" · `src/core/features/projects/api/node/settings/project-settings-service.ts:95`
- "Could not save the project and its initial account preferences. Please retry." · `src/core/features/projects/node/operations/create-project.ts:139`
- "Project repository path could not be resolved" · `src/core/features/projects/node/operations/create-project.ts:164`
- "Invalid directory" · `src/core/features/projects/node/operations/create-project.ts:86`
- "Project is already being deleted." · `src/core/features/projects/node/operations/deleteProject.ts:87`
- "Could not find an existing ancestor for the repositories root" · `src/core/features/projects/node/operations/ensure-default-repositories-root.ts:58`
- "Could not refresh the Host workspace (${registered.error.type})" · `src/core/features/projects/node/operations/initialize-repository.ts:56`
- "Could not bind the canonical Host workspace (${claimed.error.type})" · `src/core/features/projects/node/operations/initialize-repository.ts:77`
- "Project ${projectId} not found after initializing its repository" · `src/core/features/projects/node/operations/initialize-repository.ts:95`
- "Host did not return Workspace ${remoteRow.id}" · `src/core/features/projects/node/operations/updateProjectConnection.ts:101`
- "Could not retrack Workspace ${remoteRow.id} (${retracked.error.type})" · `src/core/features/projects/node/operations/updateProjectConnection.ts:104`
- "Project ${projectId} has no repository workspace" · `src/core/features/projects/node/operations/updateProjectConnection.ts:33`
- "Project ${projectId} is not an SSH project" · `src/core/features/projects/node/operations/updateProjectConnection.ts:39`
- "Workspace ${foreignRow.id} does not belong to the Project" · `src/core/features/projects/node/operations/updateProjectConnection.ts:64`
- "Workspace ${remoteRow.id} has no path" · `src/core/features/projects/node/operations/updateProjectConnection.ts:74`
- "app worktree-root migration: local host settings unavailable" · `src/core/features/projects/node/settings/migrations/app-worktree-root.ts:26`
- "app worktree-root migration: failed to write local host default" · `src/core/features/projects/node/settings/migrations/app-worktree-root.ts:31`
- "Project settings not found: ${projectId}" · `src/core/features/projects/node/settings/project-settings-storage.ts:60`
- "Paseo" · `src/core/features/projects/node/settings/sharing/paseo-config-migration.ts:68`
- "Could not check existing ${CONFIG_FILE}: ${fsErrorMessage(exists.error)}" · `src/core/features/projects/node/settings/sharing/share-project-settings-to-config.ts:25`
- "Could not read existing ${CONFIG_FILE}: ${fsErrorMessage(content.error)}" · `src/core/features/projects/node/settings/sharing/share-project-settings-to-config.ts:34`
- "Could not read existing ${CONFIG_FILE}: file was truncated." · `src/core/features/projects/node/settings/sharing/share-project-settings-to-config.ts:39`
- "Could not read existing ${CONFIG_FILE}: ${errorMessage(error)}" · `src/core/features/projects/node/settings/sharing/share-project-settings-to-config.ts:51`
- "Superset" · `src/core/features/projects/node/settings/sharing/superset-config-migration.ts:75`
- "Preparing project..." · `src/core/features/projects/node/wire-controller.ts:180`

### Search

- "Workspace was not found: ${input.workspaceId}" · `src/core/features/search/node/search-service.ts:140`

### Source control

- "Source-control workspace identity was not found" · `src/core/features/source-control/node/wire-controller.ts:294`
- "LiveJobClientHandle" · `src/core/features/source-control/node/wire-controller.ts:319`

### Tasks

- "Workspace activation was cancelled" · `src/core/features/tasks/api/node/task-service.ts:164`
- "Workspace provenance is incomplete." · `src/core/features/tasks/api/node/task-service.ts:364`
- "A Git branch is required when creating a worktree." · `src/core/features/tasks/api/node/task-service.ts:369`
- "The repository has no git remotes, so a pull request cannot be checked out." · `src/core/features/tasks/api/node/task-service.ts:376`
- "The project configuration could not be resolved." · `src/core/features/tasks/api/node/task-service.ts:385`
- "The Project for this workspace was not found." · `src/core/features/tasks/api/node/task-service.ts:439`
- "Removal failed (${removed.error.type})." · `src/core/features/tasks/api/node/task-service.ts:459`
- "Project was not found." · `src/core/features/tasks/api/node/task-service.ts:504`
- "Workspace ${identity.workspaceId} has no project configuration" · `src/core/features/tasks/api/node/task-session-launch-context.ts:106`
- "Task ${input.taskId} has no workspace" · `src/core/features/tasks/api/node/task-session-launch-context.ts:71`
- "Task ${input.taskId} is not bound to workspace ${input.workspaceId}" · `src/core/features/tasks/api/node/task-session-launch-context.ts:77`
- "The project repository workspace was not found." · `src/core/features/tasks/node/operations/createTask.ts:174`
- "The target workspace has no path to freeze into the conversation record." · `src/core/features/tasks/node/operations/createTask.ts:279`

### Terminals

- "Terminal workspace identity was not found" · `src/core/features/terminals/node/wire-controller.ts:405`

### Workspaces

- "Workspace was not found." · `src/core/features/workspaces/api/node/operations/workspace-removal.ts:185`
- "Worktree removal failed." · `src/core/features/workspaces/api/node/operations/workspace-removal.ts:331`
- "Workspace is still referenced by an active task." · `src/core/features/workspaces/api/node/operations/workspace-removal.ts:431`
- "Repository root cannot be deleted." · `src/core/features/workspaces/api/node/operations/workspace-removal.ts:81`
- "The host did not report its filesystem path semantics" · `src/core/features/workspaces/api/node/placement/workspace-placement-resolver.ts:219`
- "Path is already registered: ${error.path}" · `src/core/features/workspaces/api/node/registry-verbs.ts:108`
- "Repository record not found: ${error.repositoryId}" · `src/core/features/workspaces/api/node/registry-verbs.ts:112`
- "${detail} Wait for it to complete, or untrack the workspace to release it." · `src/core/features/workspaces/api/node/registry/workspace-tombstones.ts:137`
- "Workspace identity translation requires different source and canonical ids" · `src/core/features/workspaces/api/node/translate-workspace-identity.ts:42`
- "This workspace does not support deletion." · `src/core/features/workspaces/node/operations/delete-project-workspaces.ts:95`
- "Project has no repository workspace path." · `src/core/features/workspaces/node/operations/list-project-workspaces.ts:277`
- "Workspace path is missing." · `src/core/features/workspaces/node/operations/measure-project-workspaces.ts:61`
- "Workspace path is not available." · `src/core/features/workspaces/node/operations/measure-project-workspaces.ts:64`
- "The record is not a worktree." · `src/core/features/workspaces/node/sweep/workspace-deletion-sweep.ts:132`
- "Workspace backfill claim failed: ${JSON.stringify(claimed.error)}" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:142`
- "Invalid legacy project settings during Workspace backfill" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:320`
- "Legacy Workspace" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:55`
- "Host returned Workspace" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:59`
- "Host returned inconsistent Workspace identity" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:69`
- "Canonical Workspace" · `src/core/features/workspaces/node/sync/consolidate-workspace-backfill.ts:84`
- "Workspace state changed during Host registration" · `src/core/features/workspaces/node/sync/workspace-registry-backfill.ts:151`
- "Workspace state changed continuously during the production cutover" · `src/core/features/workspaces/node/sync/workspace-registry-backfill.ts:96`
- "Workspace setup was cancelled" · `src/core/features/workspaces/node/wire-controller.ts:131`
