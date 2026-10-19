# new-system templates

Loaded from `../SKILL.md`. Replace `__Name__` with the system name in PascalCase (e.g. `DailyBonus`). The example action ("add an amount, with a cooldown and a cap") is a placeholder: keep the shape, replace the rules. These files were checked together in a kit-template project with luau-lsp (strict, Roblox definitions, sourcemap), selene and StyLua.

Paths assume the kit layout: `src/shared` → `ReplicatedStorage.Shared`, `src/server` → `ServerScriptService.Server` (an `init.server.luau` Script whose children are the other files), `src/client` → `StarterPlayer.StarterPlayerScripts.Client`, `tests` → `ServerStorage.Tests`. If the project already has a networking wrapper, signal library, data layer, rate limiter or bootstrap, use those instead of the matching piece below.

## 1. `src/shared/Types.luau` (create if missing, otherwise add the type)

```luau
--!strict
-- Shared types (ReplicatedStorage.Shared.Types). Server and client both require this.

local Types = {}

-- __Name__: the snapshot the server sends and the client renders.
export type __Name__State = {
	count: number,
	lastActionAt: number,
}

return Types
```

## 2. `src/shared/__Name__Logic.luau` (pure rules + tunables)

```luau
--!strict
-- Pure rules for __Name__: no Roblox services, no randomness, no clock reads.
-- Tunables live in Config; time comes in as a parameter so tests can control it.

local Types = require(script.Parent.Types)

local __Name__Logic = {}

__Name__Logic.Config = table.freeze({
	MAX_AMOUNT = 10, -- largest single request
	MAX_TOTAL = 100, -- cap on the stored count
	COOLDOWN_SECONDS = 1,
})

function __Name__Logic.newState(): Types.__Name__State
	return { count = 0, lastActionAt = -math.huge }
end

function __Name__Logic.isValidAmount(amount: number): boolean
	return amount == amount -- rejects NaN
		and amount % 1 == 0 -- rejects fractions and ±inf
		and amount >= 1
		and amount <= __Name__Logic.Config.MAX_AMOUNT
end

-- Returns the next state (a new table), or nil and a reason. Never mutates `state`.
function __Name__Logic.apply(
	state: Types.__Name__State,
	amount: number,
	now: number
): (Types.__Name__State?, string?)
	local config = __Name__Logic.Config
	if not __Name__Logic.isValidAmount(amount) then
		return nil, "invalid amount"
	end
	if now - state.lastActionAt < config.COOLDOWN_SECONDS then
		return nil, "cooldown"
	end
	if state.count + amount > config.MAX_TOTAL then
		return nil, "limit reached"
	end
	return { count = state.count + amount, lastActionAt = now }, nil
end

return __Name__Logic
```

If the rules need randomness, take `rng: Random` (or `() -> number`) as a parameter; gameplay passes `Random.new()`, tests pass `Random.new(42)`.

## 3. Remotes as Rojo files (inspectable in Explorer)

`src/shared/Remotes/__Name__Request.model.json` (client → server):

```json
{ "className": "RemoteEvent" }
```

`src/shared/Remotes/__Name__Sync.model.json` (server → client snapshots):

```json
{ "className": "RemoteEvent" }
```

They become `ReplicatedStorage.Shared.Remotes.__Name__Request` / `__Name__Sync`. Use `UnreliableRemoteEvent` only for high-frequency, droppable cosmetic updates.

## 4. `src/server/RateLimit.luau` (only if the project has no rate limiter)

```luau
--!strict
-- Per-player token bucket. Create one per remote/action; call forget() on PlayerRemoving.

local RateLimit = {}
RateLimit.__index = RateLimit

type Bucket = { tokens: number, last: number }
type Fields = { perSecond: number, burst: number, buckets: { [Player]: Bucket } }
export type RateLimit = typeof(setmetatable({} :: Fields, RateLimit))

function RateLimit.new(perSecond: number, burst: number): RateLimit
	return setmetatable({ perSecond = perSecond, burst = burst, buckets = {} } :: Fields, RateLimit)
end

function RateLimit.allow(self: RateLimit, player: Player): boolean
	local now = os.clock()
	local bucket = self.buckets[player]
	if not bucket then
		bucket = { tokens = self.burst, last = now }
		self.buckets[player] = bucket
	end
	bucket.tokens = math.min(self.burst, bucket.tokens + (now - bucket.last) * self.perSecond)
	bucket.last = now
	if bucket.tokens < 1 then
		return false
	end
	bucket.tokens -= 1
	return true
end

function RateLimit.forget(self: RateLimit, player: Player)
	self.buckets[player] = nil
end

return RateLimit
```

## 5. `src/server/Systems/__Name__.luau` (server system)

```luau
--!strict
-- __Name__ server system (ServerScriptService.Server.Systems.__Name__).
-- Owns all __Name__ state. Every request: rate limit → type → range → permission → mutate → replicate.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Types = require(Shared.Types)
local __Name__Logic = require(Shared.__Name__Logic)
local RateLimit = require(script.Parent.Parent.RateLimit)

local requestRemote = Shared.Remotes.__Name__Request :: RemoteEvent
local syncRemote = Shared.Remotes.__Name__Sync :: RemoteEvent

local states: { [Player]: Types.__Name__State } = {}
local limiter = RateLimit.new(3, 5) -- 3 requests/s, bursts of 5

local __Name__ = {}

local function sync(player: Player)
	local state = states[player]
	if state then
		syncRemote:FireClient(player, table.clone(state))
	end
end

-- Public API. Gameplay, QA commands and other systems all use these, so tests exercise the real path.
function __Name__.add(player: Player, amount: number): (boolean, string?)
	local state = states[player]
	if not state then
		return false, "not loaded"
	end
	local nextState, reason = __Name__Logic.apply(state, amount, os.clock())
	if not nextState then
		return false, reason
	end
	states[player] = nextState
	sync(player)
	return true, nil
end

function __Name__.reset(player: Player)
	if states[player] then
		states[player] = __Name__Logic.newState()
		sync(player)
	end
end

function __Name__.getState(player: Player): Types.__Name__State?
	local state = states[player]
	return if state then table.clone(state) else nil
end

local function onRequest(player: Player, amount: unknown)
	-- 1. Rate limit: drop silently, never error back to a possible exploiter.
	if not limiter:allow(player) then
		return
	end
	-- 2. Type.
	if typeof(amount) ~= "number" then
		return
	end
	-- 3. Range (rejects NaN, ±inf and fractions).
	if not __Name__Logic.isValidAmount(amount) then
		return
	end
	-- 4. Permission / plausibility: system-specific (alive? in range? owns the item?). Add checks here.
	-- 5 + 6. Mutate through the public API, which re-checks the rules and replicates.
	__Name__.add(player, amount)
end

local function onPlayerAdded(player: Player)
	-- TODO(persistence): load through the project's data layer (see roblox-data) instead of a fresh state.
	states[player] = __Name__Logic.newState()
	sync(player) -- full snapshot, so late joiners render correctly
end

function __Name__.init()
	requestRemote.OnServerEvent:Connect(onRequest)
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(function(player: Player)
		states[player] = nil
		limiter:forget(player)
	end)
end

function __Name__.start()
	-- Players who joined before init() ran.
	for _, player in Players:GetPlayers() do
		if not states[player] then
			task.spawn(onPlayerAdded, player)
		end
	end
end

return __Name__
```

## 6. `src/client/Controllers/__Name__Controller.luau` (client controller)

```luau
--!strict
-- __Name__ client controller (StarterPlayerScripts.Client.Controllers.__Name__Controller).
-- Renders server state and sends requests. Computes nothing authoritative.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Types = require(Shared:WaitForChild("Types"))
local Remotes = Shared:WaitForChild("Remotes")
local requestRemote = Remotes:WaitForChild("__Name__Request") :: RemoteEvent
local syncRemote = Remotes:WaitForChild("__Name__Sync") :: RemoteEvent

local changedEvent = Instance.new("BindableEvent") -- swap for the project's signal library if it has one
local state: Types.__Name__State? = nil

local __Name__Controller = {}

__Name__Controller.changed = changedEvent.Event

function __Name__Controller.getState(): Types.__Name__State?
	return state
end

function __Name__Controller.requestAdd(amount: number)
	-- Optional optimistic UI: show the change now, but the next sync from the server is the truth
	-- (it overwrites `state`, which also reverts a rejected request).
	requestRemote:FireServer(amount)
end

function __Name__Controller.init()
	syncRemote.OnClientEvent:Connect(function(snapshot: Types.__Name__State)
		state = snapshot
		changedEvent:Fire(snapshot)
	end)
end

return __Name__Controller
```

UI (a `ScreenGui` built in Studio or as Rojo files, see `roblox-gui`) connects to `__Name__Controller.changed` and calls `requestAdd`. Snapshots fired before the controller connects are queued by Roblox and delivered when it connects.

## 7. `tests/__Name__Logic.spec.luau` (spec for the pure rules)

```luau
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local __Name__Logic = require(ReplicatedStorage.Shared.__Name__Logic)

return function(t: any)
	local config = __Name__Logic.Config

	t.test("adds a valid amount", function()
		local nextState = __Name__Logic.apply(__Name__Logic.newState(), 3, 100)
		t.expect(nextState and nextState.count).toBe(3)
	end)

	t.test("rejects out-of-range amounts", function()
		for _, amount in { 0, -1, 0.5, config.MAX_AMOUNT + 1, math.huge, 0 / 0 } do
			local nextState, reason = __Name__Logic.apply(__Name__Logic.newState(), amount, 100)
			t.expect(nextState).toBe(nil)
			t.expect(reason).toBe("invalid amount")
		end
	end)

	t.test("enforces the cooldown", function()
		local first = __Name__Logic.apply(__Name__Logic.newState(), 1, 100)
		assert(first, "first request should pass")
		local _, reason = __Name__Logic.apply(first, 1, 100 + config.COOLDOWN_SECONDS / 2)
		t.expect(reason).toBe("cooldown")
		t.expect(__Name__Logic.apply(first, 1, 100 + config.COOLDOWN_SECONDS)).toBeTruthy()
	end)

	t.test("caps the total", function()
		local full = { count = config.MAX_TOTAL, lastActionAt = 0 }
		local _, reason = __Name__Logic.apply(full, 1, 100)
		t.expect(reason).toBe("limit reached")
	end)

	t.test("never mutates the input state", function()
		local state = __Name__Logic.newState()
		__Name__Logic.apply(state, 2, 100)
		t.expect(state).toEqual(__Name__Logic.newState())
	end)
end
```

## 8. Wiring (only if the entry points are still the template's)

`src/server/init.server.luau`:

```luau
--!strict
-- Server entry point (ServerScriptService.Server). Requires each system, then runs init() before start().

local Systems = script.Systems

local systems = {
	require(Systems.__Name__),
}

for _, system in systems do
	system.init()
end
for _, system in systems do
	system.start()
end
```

`src/client/init.client.luau`:

```luau
--!strict
-- Client entry point (StarterPlayerScripts.Client). Never trust the client: validate everything on the server.

local Controllers = script.Controllers

local controllers = {
	require(Controllers.__Name__Controller),
}

for _, controller in controllers do
	controller.init()
end
```

If the entry points already have a bootstrap, add the new module to it instead (one line each).

## 9. QA hook

Add entries to the project's gated QA commands (see `roblox-testing`), calling the public API only:

```luau
-- inside a handler already gated server-side by isAuthorized(player)
__Name__.add(player, __Name__Logic.Config.MAX_AMOUNT)
__Name__.reset(player)
```

Don't reach live state with `require(...)` from `execute_luau` or the command bar: that can return a separate copy of the module (empty `states`), not the one the game is running. Go through the game's own QA entry point instead (in `roblox-testing`, a Studio-only `BindableFunction` that the QA module serves), e.g. `return game.ServerStorage.QA:Invoke("__Name__.add", game.Players:GetPlayers()[1], 5)` from `execute_luau` on the Server datamodel during a playtest.
