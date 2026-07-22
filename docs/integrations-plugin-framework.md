# Workspace integrations plugin framework

## Scope

The first delivery builds a first-party plugin framework and then implements two plugins:

1. Google Drive: workspace OAuth, task folders, linked resources, attachment export, change watches, notifications, and agent tools.
2. Telegram: workspace chat connection, mention-driven agent ingress, confirmation callbacks, and eventual notification delivery.

Arbitrary third-party code loading and a public marketplace are explicitly out of scope. Plugins ship with the tAsk deployment and use versioned contracts from `@task/integration-sdk`.

## Architecture rules

- A plugin definition is global code; an installation belongs to one workspace.
- An installation may gain multiple external connections later, even though v1 exposes one connection per plugin.
- Plugins never receive TypeORM repositories or raw database access.
- External input is verified and runtime-validated before it becomes a normalized integration event.
- Domain changes reach plugins through a transactional outbox and an idempotent worker.
- External resources are linked to stable tAsk entity IDs; paths and titles are display data only.
- Agent tools are namespaced and pass through core permission, confirmation, and audit policies.
- Secrets are stored through a secret provider; database records contain only secret references.
- Disconnect never deletes external user data by default.

## Delivery tasks

### Framework

- [x] Create a versioned integration SDK and capability-based manifest contract.
- [x] Add a registry with first-party Google Drive and Telegram manifests.
- [x] Persist workspace installations and expose guarded catalog/install/uninstall endpoints.
- [x] Add the workspace Integrations settings route and installation status cards.
- [x] Add secret-provider and external-connection contracts.
- [x] Add transactional domain-event outbox records and a retryable integration worker.
- [ ] Add verified webhook receipts, deduplication, health, and delivery audit.
- [x] Add external resources, resource links, references, and renewable subscriptions.
- [ ] Replace static agent tools with a workspace-aware tool-provider registry.
- [ ] Add a controlled MCP adapter that preserves permissions, confirmations, and audit.

### Google Drive plugin

- [x] Implement OAuth with minimal scopes and encrypted refresh-token storage.
- [x] Let an administrator select a workspace root folder.
- [x] Create and retain task/subtask folder mappings using stable Drive IDs.
- [x] Discover Drive URLs in task descriptions and comments with reference tracking.
- [x] Export new file attachments to the managed task folder idempotently.
- [ ] Create, renew, and stop Drive change channels.
- [ ] Normalize Drive changes into task activity and subscriber notifications.
- [ ] Expose read/search agent tools before enabling mutating tools.

### Telegram plugin

- [x] Represent workspace Telegram chat connections as integration connections.
- [ ] Move webhook verification and update normalization behind conversation ingress.
- [x] Preserve Telegram identity linking and workspace membership checks.
- [x] Trigger the workspace agent only for supported mentions/messages.
- [x] Preserve durable confirmation callback handling and audit.
- [ ] Add optional task-notification delivery after inbox preferences exist.

## Milestones

1. Catalog foundation: SDK, registry, installation persistence, OpenAPI, settings UI.
2. Reliable runtime: secrets, outbox, worker, webhooks, external resource model.
3. Google Drive end-to-end.
4. Telegram migration.
5. Workspace-aware agent tools and MCP bridge.

## Reliable event delivery

Task, comment, and attachment activity is projected into `integration_outbox_events` by a
PostgreSQL trigger in the same transaction as the domain mutation. The worker fans each source
event out to connected installations whose manifests consume that event, then claims deliveries
with `FOR UPDATE SKIP LOCKED`, an expiring lease, and a unique lock token. Handlers receive the
stable idempotency key `<eventId>:<installationId>` and must treat delivery as at-least-once.

Failures use bounded exponential backoff and move to `dead` after eight attempts. A stale worker
cannot complete a delivery reclaimed by another process because completion requires the active
lock token. Non-activity events, such as `integration.connected.v1`, use
`IntegrationOutboxPublisher.publishUsingManager` inside the owning domain transaction.

## External resource model

Provider objects are normalized into `integration_external_resources` and identified by the
stable pair `(connection_id, provider_resource_id)`. A resource can be linked to a workspace,
task, comment, or attachment with one of four core relations: managed root, managed container,
reference, or export. Provider names, paths, URLs, versions, and metadata are mutable display and
sync state; they are never used as tAsk identity keys.

References discovered in task descriptions and comments are stored separately from resolved
resources. This preserves unresolved and removed URLs and lets a scanner reconcile one source
without deleting unrelated links. Renewable provider watches use `integration_subscriptions` with
provider cursors, expiry and renewal timestamps, bounded status, and an optional opaque callback
secret reference. Callback secrets follow the same secret-provider boundary as OAuth credentials.

## Google Drive root folder selection

Workspace owners and administrators configure the managed root from the Integrations settings
screen. The backend exchanges the encrypted refresh token for a short-lived `drive.file` access
token and returns it only in a non-cacheable Picker session. The browser uses that token with the
Google Picker API and sends only the selected folder ID back to tAsk.

The backend does not trust the Picker result. It resolves the ID through Drive API v3, requires an
active folder with `canAddChildren`, and then stores both a normalized external resource and the
workspace `managed_root` link in one database transaction. Re-selecting the same folder is
idempotent; changing it replaces the managed-root link without deleting anything in Google Drive.

Configuration requires the OAuth variables plus `GOOGLE_DRIVE_PICKER_API_KEY` and the numeric
Google Cloud project number in `GOOGLE_DRIVE_PICKER_APP_ID`. Restrict the browser API key to the
application origins and the Google Picker API.

## Managed task folders

The Google Drive handler consumes `task.created.v1` through the integration outbox. Top-level task
folders are created under the selected workspace root; subtask folders are created under the
managed folder of their parent task. Folder names are display data (`PROJECT-123 Title`), while
resource links continue to use the immutable task UUID.

Folder creation reserves a Drive-generated file ID and a `managed_container` mapping in the
database before calling Drive. Google supports pre-generated IDs for folders, so a retry after an
indeterminate timeout receives the existing folder instead of creating a duplicate. The mapping
stays in a reserved state until Drive returns validated metadata and then becomes active.

Selecting or changing the workspace root emits a durable configuration event. Its handler
idempotently backfills folders for existing active tasks, including their parent hierarchy. Existing
task-folder mappings retain their Drive IDs when the root selection changes.

## Drive attachment export

The Drive handler consumes `attachment.created.v1` and exports file attachments into the managed
folder of their task. Attachment bytes come through a typed content-provider boundary; the first
provider resolves storage keys below the absolute `ATTACHMENT_STORAGE_ROOT`. It resolves real paths,
rejects symlink and path escape, verifies declared size, and enforces a 25 MiB in-memory multipart
upload limit. Link and Telegram-file attachments remain unchanged when no matching content provider
exists.

As with folders, the exporter asks Drive for a file ID and persists an unavailable external resource
plus the attachment `export` link before uploading bytes. At-least-once retries reuse that ID and
validate the existing file's attachment identity, parent, name, and MIME metadata instead of creating
a duplicate. A successful upload activates the resource mapping. Root-folder selection also backfills
existing file attachments after task folders have been provisioned.

## Drive reference discovery

Task create/update and comment create events reconcile the source text against
`integration_resource_references`. Supported `drive.google.com` and `docs.google.com` URL forms are
normalized to a stable Drive resource ID and canonical URL before hashing, so sharing and editor
variants of the same link do not create duplicate references. Exact Google host validation rejects
lookalike domains.

Reconciliation locks the source row, reactivates links that reappear, and marks links removed from
task descriptions without deleting their history. A reference becomes active immediately when its
Drive ID already exists in the integration resource catalog; otherwise it remains unresolved for a
later Drive metadata/watch pass.

## Telegram workspace connection

Enabling Telegram in workspace settings lets an owner or administrator create a ten-minute,
single-use `/connect` command. Only the Telegram identity linked to the initiating tAsk user can
consume the token. Completion atomically creates or updates the `telegram_chats` record, stores an
active integration connection keyed by the stable Telegram chat ID, marks the installation
connected, consumes the token, and publishes `integration.connected.v1`.

The bot submits connection commands through the bot-shared-secret API boundary. Normal Telegram
context resolution now also requires the matching Telegram integration and connection to remain
active, in addition to the existing user identity and workspace membership checks.

Private chats may invoke the agent directly. Group chats require `/task` or an exact mention of the
username configured in `TELEGRAM_BOT_USERNAME`; mentioning another user no longer starts an agent
run. Existing durable confirmation callbacks continue through the same resolved workspace/user
context.
