--!strict
-- Dependency-free test runner. Runs every ModuleScript named "*.spec" under a root.
-- A spec module returns `function(t) t.test("name", function() t.expect(x).toBe(y) end) end`.
-- Works in Studio (execute_luau), Open Cloud Luau Execution, and run-in-roblox.

export type Result = { name: string, ok: boolean, err: string? }
export type Summary = { passed: number, failed: number, results: { Result } }

local function deepEqual(a: any, b: any): boolean
	if a == b then
		return true
	end
	if type(a) ~= "table" or type(b) ~= "table" then
		return false
	end
	for k, v in a do
		if not deepEqual(v, b[k]) then
			return false
		end
	end
	for k in b do
		if a[k] == nil then
			return false
		end
	end
	return true
end

local function expect(actual: any)
	local function fail(message: string)
		error(message, 3)
	end
	return {
		toBe = function(expected: any)
			if actual ~= expected then
				fail(`expected {tostring(expected)}, got {tostring(actual)}`)
			end
		end,
		toEqual = function(expected: any)
			if not deepEqual(actual, expected) then
				fail("expected tables to be deeply equal")
			end
		end,
		toBeTruthy = function()
			if not actual then
				fail(`expected a truthy value, got {tostring(actual)}`)
			end
		end,
		toThrow = function()
			if type(actual) ~= "function" then
				fail("toThrow expects a function")
			end
			if pcall(actual) then
				fail("expected function to throw")
			end
		end,
	}
end

local TestRunner = {}

function TestRunner.run(root: Instance): Summary
	local results: { Result } = {}
	for _, module in root:GetDescendants() do
		if not (module:IsA("ModuleScript") and string.match(module.Name, "%.spec$")) then
			continue
		end
		local loaded, spec = pcall(require, module)
		if not loaded or type(spec) ~= "function" then
			table.insert(results, { name = module.Name, ok = false, err = `failed to load: {tostring(spec)}` })
			continue
		end
		local t = {
			expect = expect,
			test = function(name: string, fn: () -> any)
				local ok, err = pcall(fn)
				table.insert(
					results,
					{ name = `{module.Name} > {name}`, ok = ok, err = if ok then nil else tostring(err) }
				)
			end,
		}
		local ran, err = pcall(spec, t)
		if not ran then
			table.insert(results, { name = module.Name, ok = false, err = tostring(err) })
		end
	end
	local failed = 0
	for _, r in results do
		if not r.ok then
			failed += 1
		end
	end
	return { passed = #results - failed, failed = failed, results = results }
end

return TestRunner
