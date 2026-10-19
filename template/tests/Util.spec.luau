--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Util = require(ReplicatedStorage.Shared.Util)

return function(t: any)
	t.test("clamp01 clamps into [0, 1]", function()
		t.expect(Util.clamp01(-2)).toBe(0)
		t.expect(Util.clamp01(0.5)).toBe(0.5)
		t.expect(Util.clamp01(9)).toBe(1)
	end)

	t.test("formatNumber abbreviates large numbers", function()
		t.expect(Util.formatNumber(999)).toBe("999")
		t.expect(Util.formatNumber(1500)).toBe("1.5K")
		t.expect(Util.formatNumber(2500000)).toBe("2.5M")
	end)
end
