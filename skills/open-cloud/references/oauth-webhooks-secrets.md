# Open Cloud integrations: OAuth, webhooks, secrets, REST mechanics

Loaded on demand from `../SKILL.md`. Adapted from an MIT-licensed community skill (see `../ATTRIBUTION.md`). Endpoint paths, scopes and schemas change: confirm each one with `docs_search` / `docs_fetch` (or `/docs/cloud/openapi.json`) before writing a request. Never infer one resource's path from another's example.

## 1. Classify the integration first

| Caller | Credential | Example |
|---|---|---|
| Owner automation (backend, CI, bot) | API key | CI uploads a place; a backend reads DataStores |
| Delegated third-party app | OAuth 2.0 (user grants specific resources) | A dashboard that manages a user's experiences |
| Webhook receiver | Webhook secret (signature) | Notified on subscription or right-to-erasure events |
| In-experience server script | API key from the Secrets store via `HttpService` | A game server calling an Open Cloud endpoint that supports it |

Gameplay remotes belong to `roblox-networking`; persistence design to `roblox-data`; Studio control to `studio-mcp`.

Offer Open Cloud when you see the user hand-doing what it automates (bulk asset uploads, metadata edits across many assets, exporting data, reacting to platform events), but don't assume keys, scopes or quota: name the option and let the user choose.

## 2. API keys

Use when trusted automation acts for its owner. Before implementing: identify the exact resource and operation; confirm the creator/group permission; grant only the needed scopes and resources (and an IP allowlist where possible); store the key in a secret manager, CI secret or Roblox Secret; plan rotation and revocation. Keep keys out of source, logs, URLs, replicated instances and client code. A valid key doesn't override missing creator permission or an endpoint's resource restrictions. Don't mix API-key and OAuth credentials in one request or use one as a fallback for the other.

## 3. OAuth 2.0

Roblox supports the authorization code flow and its PKCE extension. Users must be 13+ to authorize apps; registering/publishing an app has its own requirements (check the Creator Dashboard).

- **Public client** (can't keep a secret: SPA, desktop, mobile): PKCE required, no client secret.
- **Confidential client** (has a backend): exchange codes on the backend with the client secret; still use PKCE as defence in depth.

**Register:** exact redirect URLs; request only scopes the product uses (`openid` only if you need an ID token, `profile` only for profile claims).

**Authorize** (`https://apis.roblox.com/oauth/v1/authorize`), per attempt:

1. random `state`, stored with the pending session;
2. fresh PKCE verifier and its SHA-256 base64url challenge;
3. `client_id`, exact `redirect_uri`, `scope`, `response_type=code`, `code_challenge`, `code_challenge_method=S256`;
4. `nonce` when OIDC identity binding needs it.

Never put a client secret in the authorization URL or a frontend bundle.

**Callback:** reject a mismatched `state`; handle explicit OAuth errors; exchange the short-lived, single-use code at `POST https://apis.roblox.com/oauth/v1/token` (`application/x-www-form-urlencoded`) with the original verifier. Never log codes or token responses.

**Tokens:** store access and refresh tokens in trusted storage. Refresh tokens rotate: atomically replace the stored token after a successful refresh, and give concurrent refreshes a single owner so an older response can't overwrite the newest token. Re-authorize when scopes change; revoke on disconnect or suspected compromise.

Endpoint roles differ: `userinfo` = OIDC identity claims; `introspect` = token activity/claims (not proof of resource access); `token/resources` = which resources the user granted; the protected endpoint itself is the final enforcement point.

## 4. REST mechanics

Confirm per endpoint: API version and path template, parameter types, request/response schema, scopes and resource grants, quotas, whether it returns an Operation, and whether `HttpService` may call it. Newer resources live under `https://apis.roblox.com/cloud/v2/...`; some remain on older surfaces. Don't "modernise" a documented path.

- **Pagination:** pass `nextPageToken` back as `pageToken` with the same filters and ordering. A token belongs to its original query.
- **Partial updates:** `updateMask` lists only the fields you intend to change, with exact field paths.
- **Long-running operations:** poll the returned Operation with bounded exponential backoff plus jitter and a deadline; surface terminal errors instead of reporting the initial request as success.
- **Errors:** `INVALID_ARGUMENT` → fix IDs/filters/mask/body. `PERMISSION_DENIED` / `INSUFFICIENT_SCOPE` → check creator permission, key/OAuth scope and resource grant separately. HTTP 429 / `RESOURCE_EXHAUSTED` → honour `Retry-After`, reduce pressure. `UNAVAILABLE` / transport errors → bounded retry.
- Retry only transient failures. A timeout with no status is **unknown, not failed**: read the resource back before repeating a non-idempotent write.

**Diagnosis order** for a failing request (log endpoint, request ID, status, Roblox error code; never secrets or full tokens): domain/version/path/method/content-type → credential type valid for this endpoint → creator/group permission → key or OAuth scopes → OAuth resource grants → request schema and update mask → quota and retry headers → Operation status. Don't broaden scopes until you've found the failing boundary.

## 5. In-experience calls and the Secrets store

An Open Cloud endpoint isn't automatically callable from an experience; check engine support first. When it is: HTTPS only, server-side only, validate path parameters (reject traversal-like input), bound retries and volume, and never route a request through a client.

Credentials live in the experience's **Secrets store**, not the place file:

- `HttpService:GetSecret(name)` returns a `Secret`. It can't be printed or logged in clear (it prints as a placeholder), so build the header or URL with `secret:AddPrefix(...)` / `secret:AddSuffix(...)` instead of string concatenation.
- Secrets are available only on live servers and in collaborative testing. Local playtests and client scripts get `Can't find secret with given key`. For local testing, add values in Studio under File → Experience Settings → Security → Local Secrets.
- Create secrets in the Creator Dashboard (the experience's Secrets section) or via Open Cloud. Only the experience or group owner can manage them; up to 500 per experience.
- Each secret has an allowed domain. Use the narrowest one (`my.example.com`, not `*`).
- **Allow HTTP Requests** must be on (File → Experience Settings → Security).

Never put anything credential-shaped in `ReplicatedStorage`, a `StringValue`, an attribute or a ModuleScript: clients can read replicated content.

## 6. Webhooks

Delivery is at-least-once and can be delayed; a failing URL is retried 5 times and then considered invalid.

1. Expose a public HTTPS POST endpoint.
2. If a secret is configured, verify the `roblox-signature` header (`t=<timestamp>,v1=<signature>`): compute Base64(HMAC-SHA256(secret, `<timestamp>.<raw JSON body>`)) and compare with `v1` using a constant-time comparison.
3. Reject stale timestamps (Roblox suggests a ~10-minute window) to stop replays.
4. Deduplicate by `NotificationId` in durable/shared storage (a memory-only set doesn't survive restarts).
5. Persist or enqueue the work, return 2xx quickly, and do slow side effects asynchronously. Don't acknowledge before the work is recoverable.

Check the current webhook docs for the exact header/footer format of third-party targets; don't copy a generic provider's scheme.

## 7. Pre-ship security checklist

- No credential or token in source, URLs, browser bundles, replicated instances, analytics or ordinary logs.
- Redirect URLs exact and owned by the app; `state` bound to one attempt; PKCE fresh per attempt.
- Requested scopes match visible behaviour; API keys resource-scoped and revocable.
- Token rotation atomic and concurrency-safe.
- Webhook verification happens before any side effect; retries can't duplicate non-idempotent work.
- Permission failures aren't masked by fallback credentials.
